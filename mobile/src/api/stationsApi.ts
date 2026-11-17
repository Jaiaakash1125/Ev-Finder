import { stations as fallbackStations } from "../data/stations";
import { Station } from "../types";
import Constants from "expo-constants";

// Machine's active IPv4 address from ipconfig so real phones/Expo Go on local Wi-Fi can reach the server
export const BASE_URL = "http://192.168.29.236/api/v1";

// Dynamically determine host IP as backup if running on physical device with Expo debuggerHost
const debuggerHost =
  Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
const hostIp = debuggerHost ? debuggerHost.split(":")[0] : "192.168.29.236";

export const API_BASE_URLS = [
  BASE_URL,
  `http://${hostIp}/api/v1`,
  `http://localhost/api/v1`,
  `http://127.0.0.1/api/v1`,
];

export interface FetchStationsResult {
  success: boolean;
  data: Station[];
  total: number;
  page: number;
  pages: number;
  count?: number;
  isLiveDb?: boolean;
  source?: "xampp_mysql" | "local_fallback";
  error?: string;
}

export interface FetchStationsParams {
  limit?: number;
  offset?: number;
  page?: number;
  city?: string;
  state?: string;
  network?: string;
  status?: string;
  connector?: string;
  min_power_kw?: number;
  q?: string;
}

export interface NearbyStationsParams {
  lat: number;
  lng: number;
  radius_km?: number;
  limit?: number;
  connector?: string;
  min_power_kw?: number;
  network?: string;
  status?: string;
}

export interface BoundsParams {
  min_lat: number;
  min_lng: number;
  max_lat: number;
  max_lng: number;
  limit?: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  database?: string;
  stations?: number;
  totalStationsInDb?: number;
  timestamp: string;
}

/**
 * Normalizes raw API response station item to ensure all fields match TypeScript types
 */
export function normalizeStation(raw: any): Station {
  let connectors: string[] = [];
  if (Array.isArray(raw.connectors)) {
    connectors = raw.connectors;
  } else if (typeof raw.connectors === "string") {
    try {
      connectors = JSON.parse(raw.connectors);
    } catch {
      connectors = raw.connectors.split(",").map((c: string) => c.trim());
    }
  }

  let amenities: string[] = [];
  if (Array.isArray(raw.amenities)) {
    amenities = raw.amenities;
  } else if (typeof raw.amenities === "string") {
    try {
      amenities = JSON.parse(raw.amenities);
    } catch {
      amenities = raw.amenities.split(",").map((a: string) => a.trim());
    }
  }

  return {
    id: String(raw.id || `st-${Math.random().toString(36).substring(2, 9)}`),
    name: String(raw.name || "EV Charging Station"),
    network: String(raw.network || "Public Charger"),
    city: String(raw.city || ""),
    state: String(raw.state || "India"),
    address: String(raw.address || ""),
    pincode: String(raw.pincode || ""),
    lat: Number(raw.lat || raw.latitude) || 20.5937,
    lng: Number(raw.lng || raw.longitude) || 78.9629,
    distanceKm: Number(raw.distanceKm ?? raw.distance_km) || 0,
    status: ["available", "limited", "busy", "offline"].includes(raw.status)
      ? raw.status
      : "available",
    freePorts: Number(raw.freePorts ?? raw.free_ports ?? 1),
    totalPorts: Number(raw.totalPorts ?? raw.total_ports ?? 2),
    connectors: connectors.length > 0 ? connectors : ["CCS2", "Type 2 AC"],
    maxPowerKw: Number(raw.maxPowerKw ?? raw.max_power_kw ?? 50),
    pricePerKwh: Number(raw.pricePerKwh ?? raw.price_per_kwh ?? 10),
    hours: String(raw.hours || "24×7"),
    amenities: amenities.length > 0 ? amenities : ["Restrooms"],
    rating: Number(raw.rating || 4.5),
    reviews: Number(raw.reviews || 0),
    isFavorite: Boolean(raw.isFavorite),
  };
}

/**
 * Executes a fetch across candidate base URLs with automatic fallback
 */
async function fetchFromApi<T>(path: string, options?: RequestInit, timeoutMs = 3000): Promise<T | null> {
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  for (const baseUrl of API_BASE_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const url = `${baseUrl}${urlPath}`;

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return (await response.json()) as T;
      }
    } catch {
      // try next candidate base URL
    }
  }
  return null;
}

/**
 * Fetch stations near a location (GET /api/v1/stations/nearby)
 * Usage: api.nearby(lat, lng, radius)
 */
export async function nearby(
  lat: number,
  lng: number,
  radius_km: number = 10,
  extraParams?: Partial<Omit<NearbyStationsParams, "lat" | "lng" | "radius_km">>
): Promise<FetchStationsResult> {
  return await fetchNearbyStations({ lat, lng, radius_km, ...extraParams });
}

export async function fetchNearbyStations(params: NearbyStationsParams): Promise<FetchStationsResult> {
  const queryParts: string[] = [
    `lat=${encodeURIComponent(params.lat)}`,
    `lng=${encodeURIComponent(params.lng)}`,
  ];
  if (params.radius_km !== undefined) queryParts.push(`radius_km=${encodeURIComponent(params.radius_km)}`);
  if (params.limit !== undefined) queryParts.push(`limit=${encodeURIComponent(params.limit)}`);
  if (params.connector) queryParts.push(`connector=${encodeURIComponent(params.connector)}`);
  if (params.min_power_kw) queryParts.push(`min_power_kw=${encodeURIComponent(params.min_power_kw)}`);
  if (params.network) queryParts.push(`network=${encodeURIComponent(params.network)}`);
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);

  const result = await fetchFromApi<{
    success: boolean;
    count: number;
    total?: number;
    page?: number;
    pages?: number;
    data: any[];
  }>(`/stations/nearby?${queryParts.join("&")}`);

  if (result && Array.isArray(result.data)) {
    const list = result.data.map(normalizeStation);
    return {
      success: true,
      data: list,
      total: result.total ?? list.length,
      page: result.page ?? 1,
      pages: result.pages ?? 1,
      count: list.length,
      isLiveDb: true,
      source: "xampp_mysql",
    };
  }

  // Fallback to local calculation
  return {
    success: false,
    data: [],
    total: 0,
    page: 1,
    pages: 1,
    count: 0,
    isLiveDb: false,
    source: "local_fallback",
  };
}

/**
 * Fetch stations within a map viewport bounding box (GET /api/v1/stations/bounds)
 * Usage: api.bounds(min_lat, min_lng, max_lat, max_lng, limit)
 */
export async function bounds(
  min_lat: number,
  min_lng: number,
  max_lat: number,
  max_lng: number,
  limit = 200
): Promise<FetchStationsResult> {
  const data = await fetchStationsInBounds({ min_lat, min_lng, max_lat, max_lng, limit });
  return {
    success: true,
    data,
    total: data.length,
    page: 1,
    pages: 1,
    count: data.length,
    isLiveDb: true,
    source: "xampp_mysql",
  };
}

export async function fetchStationsInBounds(params: BoundsParams): Promise<Station[]> {
  const query = `min_lat=${params.min_lat}&min_lng=${params.min_lng}&max_lat=${params.max_lat}&max_lng=${params.max_lng}${
    params.limit ? `&limit=${params.limit}` : ""
  }`;
  const result = await fetchFromApi<{ success: boolean; data: any[] }>(`/stations/bounds?${query}`);
  if (result && Array.isArray(result.data)) {
    return result.data.map(normalizeStation);
  }
  return [];
}

/**
 * Fetch paginated/filtered stations from the REST API (GET /api/v1/stations)
 */
export async function fetchStations(params?: FetchStationsParams): Promise<FetchStationsResult> {
  const queryParts: string[] = [];
  if (params) {
    if (params.limit !== undefined) queryParts.push(`limit=${encodeURIComponent(params.limit)}`);
    if (params.offset !== undefined) queryParts.push(`offset=${encodeURIComponent(params.offset)}`);
    if (params.page !== undefined) queryParts.push(`page=${encodeURIComponent(params.page)}`);
    if (params.city) queryParts.push(`city=${encodeURIComponent(params.city)}`);
    if (params.state) queryParts.push(`state=${encodeURIComponent(params.state)}`);
    if (params.network) queryParts.push(`network=${encodeURIComponent(params.network)}`);
    if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.connector) queryParts.push(`connector=${encodeURIComponent(params.connector)}`);
    if (params.min_power_kw) queryParts.push(`min_power_kw=${encodeURIComponent(params.min_power_kw)}`);
    if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
  }

  const queryString = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  const result = await fetchFromApi<{
    success: boolean;
    count: number;
    total: number;
    page: number;
    pages: number;
    data: any[];
  }>(`/stations${queryString}`);

  if (result && Array.isArray(result.data) && result.data.length > 0) {
    const list = result.data.map(normalizeStation);
    return {
      success: true,
      data: list,
      total: result.total ?? list.length,
      page: result.page ?? 1,
      pages: result.pages ?? 1,
      count: list.length,
      isLiveDb: true,
      source: "xampp_mysql",
    };
  }

  // Offline / fallback mode
  let filteredFallback = fallbackStations as Station[];
  if (params?.city && params.city.toLowerCase() !== "all" && params.city.toLowerCase() !== "all india") {
    filteredFallback = filteredFallback.filter((s) =>
      s.city.toLowerCase().includes(params.city!.toLowerCase())
    );
  }

  return {
    success: false,
    data: filteredFallback,
    total: fallbackStations.length,
    page: 1,
    pages: 1,
    count: filteredFallback.length,
    isLiveDb: false,
    source: "local_fallback",
  };
}

/**
 * Search stations by query string (GET /api/v1/stations/search)
 */
export async function searchStations(q: string, city?: string, limit = 50): Promise<Station[]> {
  const query = `q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ""}&limit=${limit}`;
  const result = await fetchFromApi<{ success: boolean; data: any[] }>(`/stations/search?${query}`);
  if (result && Array.isArray(result.data)) {
    return result.data.map(normalizeStation);
  }
  return [];
}

/**
 * Fetch single station by ID (GET /api/v1/stations/{id})
 */
export async function fetchStationById(id: string): Promise<Station | null> {
  const result = await fetchFromApi<{ success: boolean; data: any }>(`/stations/${encodeURIComponent(id)}`);
  if (result && result.data) {
    return normalizeStation(result.data);
  }
  return null;
}

/**
 * Check health status of API (GET /api/v1/health)
 */
export async function checkApiHealth(): Promise<HealthResponse | null> {
  return await fetchFromApi<HealthResponse>("/health", undefined, 1500);
}

export const api = {
  BASE_URL,
  nearby,
  bounds,
  stations: fetchStations,
  getStations: fetchStations,
  fetchStations,
  fetchNearbyStations,
  fetchStationsInBounds,
  searchStations,
  fetchStationById,
  checkApiHealth,
};

export const stationsApi = api;
export default api;
