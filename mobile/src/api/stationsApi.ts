import { ReviewItem, Station } from "../types";
import { cleanCityList, isValidCityName } from "../utils/cityUtils";
import { API_BASE_URL, API_TIMEOUT_MS } from "./config";

export { API_BASE_URL };

export interface ApiErrorOptions {
  status?: number;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  isAborted?: boolean;
}

export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;
  isTimeout: boolean;
  isAborted: boolean;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isTimeout = Boolean(options.isTimeout);
    this.isAborted = Boolean(options.isAborted);
  }
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isAborted;
  }
  return error instanceof Error && error.name === "AbortError";
}

export function getErrorMessage(error: unknown, fallback = "Can't reach server"): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface FetchStationsResult {
  success: boolean;
  data: Station[];
  total: number;
  page: number;
  pages: number;
  count: number;
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
  service?: string;
  version?: string;
  database?: string;
  stations: number;
  totalStationsInDb?: number;
  timestamp?: string;
}

export interface CreateReviewInput {
  userName?: string;
  rating: number;
  comment?: string;
  plugCondition: ReviewItem["plugCondition"];
}

/**
 * Normalizes a raw API station record to match the Station TypeScript type.
 */
export function normalizeStation(raw: any): Station {
  let connectors: string[] = [];
  if (Array.isArray(raw?.connectors)) {
    connectors = raw.connectors.map(String);
  } else if (typeof raw?.connectors === "string" && raw.connectors.trim()) {
    try {
      const parsed = JSON.parse(raw.connectors);
      connectors = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      connectors = raw.connectors
        .split(",")
        .map((c: string) => c.trim())
        .filter(Boolean);
    }
  }

  let amenities: string[] = [];
  if (Array.isArray(raw?.amenities)) {
    amenities = raw.amenities.map(String);
  } else if (typeof raw?.amenities === "string" && raw.amenities.trim()) {
    try {
      const parsed = JSON.parse(raw.amenities);
      amenities = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      amenities = raw.amenities
        .split(",")
        .map((a: string) => a.trim())
        .filter(Boolean);
    }
  }

  const rawDistance = raw?.distanceKm ?? raw?.distance_km;
  const distanceKm =
    rawDistance !== undefined && rawDistance !== null && !Number.isNaN(Number(rawDistance))
      ? Number(rawDistance)
      : undefined;

  const rawCity = String(raw?.city || "").trim();
  const safeCity = isValidCityName(rawCity) ? rawCity : String(raw?.state || "India");

  let safeAddress = String(raw?.address || "").trim();
  if (safeAddress.includes("?")) {
    safeAddress = safeAddress.replace(/\?+/g, "").replace(/\s+,/g, ",").trim();
  }

  return {
    id: String(raw?.id ?? ""),
    name: String(raw?.name || "EV Charging Station"),
    network: String(raw?.network || "Public Charger"),
    city: safeCity,
    state: String(raw?.state || "India"),
    address: safeAddress || safeCity,
    pincode: String(raw?.pincode || ""),
    lat: Number(raw?.lat ?? raw?.latitude) || 20.5937,
    lng: Number(raw?.lng ?? raw?.longitude) || 78.9629,
    distanceKm,
    status: ["available", "limited", "busy", "offline"].includes(raw?.status)
      ? raw.status
      : "available",
    freePorts: Number(raw?.freePorts ?? raw?.free_ports ?? 0),
    totalPorts: Number(raw?.totalPorts ?? raw?.total_ports ?? 1),
    connectors: connectors.length > 0 ? connectors : ["CCS2", "Type 2 AC"],
    maxPowerKw: Number(raw?.maxPowerKw ?? raw?.max_power_kw ?? 50),
    pricePerKwh: Number(raw?.pricePerKwh ?? raw?.price_per_kwh ?? 10),
    hours: String(raw?.hours || "24×7"),
    amenities,
    rating: Number(raw?.rating ?? 0),
    reviews: Number(raw?.reviews ?? 0),
    isFavorite: Boolean(raw?.isFavorite),
  };
}

function normalizeReview(raw: any): ReviewItem {
  const validConditions: ReviewItem["plugCondition"][] = [
    "working_perfect",
    "slow_charge",
    "broken_connector",
  ];
  const condition = validConditions.includes(raw?.plugCondition ?? raw?.plug_condition)
    ? (raw?.plugCondition ?? raw?.plug_condition)
    : "working_perfect";

  return {
    id: String(raw?.id ?? ""),
    stationId: String(raw?.stationId ?? raw?.station_id ?? ""),
    userName: String(raw?.userName ?? raw?.user_name ?? "EV Driver"),
    rating: Number(raw?.rating ?? 5),
    comment: String(raw?.comment ?? ""),
    plugCondition: condition,
    createdAt: String(raw?.createdAt ?? raw?.created_at ?? ""),
  };
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * Core fetch helper with timeout, AbortController support, and clear error messages.
 */
async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal, timeoutMs = API_TIMEOUT_MS, headers } = options;
  const urlPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${urlPath}`;

  if (signal?.aborted) {
    throw new ApiError("Request cancelled", { isAborted: true });
  }

  const controller = new AbortController();
  let didTimeout = false;

  const onExternalAbort = () => controller.abort();
  signal?.addEventListener("abort", onExternalAbort);

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const text = await response.text();
    let payload: any = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const serverMsg =
        payload?.error ||
        payload?.message ||
        `Server returned error (${response.status})`;
      throw new ApiError(String(serverMsg), { status: response.status });
    }

    if (payload === null) {
      throw new ApiError("Invalid JSON response from server", { status: response.status });
    }

    return payload as T;
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (signal?.aborted) {
      throw new ApiError("Request cancelled", { isAborted: true });
    }

    if (didTimeout) {
      throw new ApiError(
        `Request timed out. Can't reach server at ${API_BASE_URL}.`,
        { isTimeout: true, isNetworkError: true }
      );
    }

    throw new ApiError(
      `Can't reach server at ${API_BASE_URL}. Check Wi-Fi and EXPO_PUBLIC_API_URL.`,
      { isNetworkError: true }
    );
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onExternalAbort);
  }
}

/**
 * GET /health
 */
export async function checkApiHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const res = await apiFetch<HealthResponse>("/health", { signal, timeoutMs: 5000 });
  return {
    ...res,
    stations: Number(res.stations ?? res.totalStationsInDb ?? 0),
  };
}

/**
 * GET /stations?page&limit&city&state&network&connector&min_power_kw&status&q
 */
export async function fetchStations(
  params?: FetchStationsParams,
  signal?: AbortSignal
): Promise<FetchStationsResult> {
  const query = buildQuery({
    page: params?.page,
    limit: params?.limit,
    offset: params?.offset,
    city: params?.city && params.city !== "All India" ? params.city : undefined,
    state: params?.state,
    network: params?.network,
    status: params?.status,
    connector: params?.connector,
    min_power_kw: params?.min_power_kw,
    q: params?.q,
  });

  const res = await apiFetch<{
    success: boolean;
    count?: number;
    total?: number;
    page?: number;
    pages?: number;
    data: any[];
  }>(`/stations${query}`, { signal });

  const list = Array.isArray(res.data) ? res.data.map(normalizeStation) : [];
  return {
    success: Boolean(res.success ?? true),
    data: list,
    count: res.count ?? list.length,
    total: res.total ?? list.length,
    page: res.page ?? params?.page ?? 1,
    pages: res.pages ?? 1,
  };
}

/**
 * GET /stations/nearby?lat&lng&radius_km&limit&connector&min_power_kw&network&status
 */
export async function fetchNearbyStations(
  params: NearbyStationsParams,
  signal?: AbortSignal
): Promise<FetchStationsResult> {
  const query = buildQuery({
    lat: params.lat,
    lng: params.lng,
    radius_km: params.radius_km,
    limit: params.limit,
    connector: params.connector,
    min_power_kw: params.min_power_kw,
    network: params.network,
    status: params.status,
  });

  const res = await apiFetch<{
    success: boolean;
    count?: number;
    total?: number;
    page?: number;
    pages?: number;
    data: any[];
  }>(`/stations/nearby${query}`, { signal });

  const list = Array.isArray(res.data) ? res.data.map(normalizeStation) : [];
  return {
    success: Boolean(res.success ?? true),
    data: list,
    count: res.count ?? list.length,
    total: res.total ?? list.length,
    page: res.page ?? 1,
    pages: res.pages ?? 1,
  };
}

export async function nearby(
  lat: number,
  lng: number,
  radius_km = 25,
  extraParams?: Partial<Omit<NearbyStationsParams, "lat" | "lng" | "radius_km">>,
  signal?: AbortSignal
): Promise<FetchStationsResult> {
  return fetchNearbyStations({ lat, lng, radius_km, ...extraParams }, signal);
}

/**
 * GET /stations/bounds?min_lat&min_lng&max_lat&max_lng&limit
 */
export async function fetchStationsInBounds(
  params: BoundsParams,
  signal?: AbortSignal
): Promise<Station[]> {
  const query = buildQuery({
    min_lat: params.min_lat,
    min_lng: params.min_lng,
    max_lat: params.max_lat,
    max_lng: params.max_lng,
    limit: params.limit,
  });

  const res = await apiFetch<{ success: boolean; data: any[] }>(`/stations/bounds${query}`, {
    signal,
  });

  return Array.isArray(res.data) ? res.data.map(normalizeStation) : [];
}

export async function bounds(
  min_lat: number,
  min_lng: number,
  max_lat: number,
  max_lng: number,
  limit = 300,
  signal?: AbortSignal
): Promise<FetchStationsResult> {
  const data = await fetchStationsInBounds({ min_lat, min_lng, max_lat, max_lng, limit }, signal);
  return {
    success: true,
    data,
    count: data.length,
    total: data.length,
    page: 1,
    pages: 1,
  };
}

/**
 * GET /stations/search?q&city&limit
 */
export async function searchStations(
  q: string,
  city?: string,
  limit = 50,
  signal?: AbortSignal
): Promise<Station[]> {
  const query = buildQuery({
    q,
    city: city && city !== "All India" ? city : undefined,
    limit,
  });

  const res = await apiFetch<{ success: boolean; data: any[] }>(`/stations/search${query}`, {
    signal,
  });

  return Array.isArray(res.data) ? res.data.map(normalizeStation) : [];
}

/**
 * GET /stations/cities
 */
export async function fetchCities(signal?: AbortSignal): Promise<string[]> {
  const res = await apiFetch<{ success: boolean; data: string[] }>("/stations/cities", { signal });
  const raw = Array.isArray(res.data) ? res.data.map(String) : [];
  return cleanCityList(raw);
}

/**
 * GET /stations/{id}
 */
export async function fetchStationById(id: string, signal?: AbortSignal): Promise<Station> {
  const res = await apiFetch<{ success: boolean; data: any }>(
    `/stations/${encodeURIComponent(id)}`,
    { signal }
  );
  if (!res?.data) {
    throw new ApiError("Station not found", { status: 404 });
  }
  return normalizeStation(res.data);
}

/**
 * GET /stations/{id}/reviews
 */
export async function fetchStationReviews(
  stationId: string,
  signal?: AbortSignal
): Promise<ReviewItem[]> {
  const res = await apiFetch<{ success: boolean; data: any[] }>(
    `/stations/${encodeURIComponent(stationId)}/reviews`,
    { signal }
  );
  return Array.isArray(res.data) ? res.data.map(normalizeReview) : [];
}

/**
 * POST /stations/{id}/reviews
 */
export async function postStationReview(
  stationId: string,
  review: CreateReviewInput,
  signal?: AbortSignal
): Promise<ReviewItem> {
  const res = await apiFetch<{ success: boolean; data: any }>(
    `/stations/${encodeURIComponent(stationId)}/reviews`,
    {
      method: "POST",
      body: {
        userName: review.userName?.trim() || "EV Driver",
        rating: review.rating,
        comment: review.comment?.trim() || "",
        plugCondition: review.plugCondition,
      },
      signal,
    }
  );
  return normalizeReview(res.data);
}

export const api = {
  BASE_URL: API_BASE_URL,
  health: checkApiHealth,
  checkApiHealth,
  stations: fetchStations,
  getStations: fetchStations,
  fetchStations,
  nearby,
  fetchNearbyStations,
  bounds,
  fetchStationsInBounds,
  search: searchStations,
  searchStations,
  cities: fetchCities,
  fetchCities,
  station: fetchStationById,
  fetchStationById,
  getReviews: fetchStationReviews,
  fetchStationReviews,
  postReview: postStationReview,
  postStationReview,
};

export const stationsApi = api;
export default api;
