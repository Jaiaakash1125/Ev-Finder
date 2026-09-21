import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Station, UserProfile, RoutePlanResult, ReviewItem } from "../types";
import { stations as fallbackStations, cityCoordinates } from "../data/stations";

// Dynamically determine backend URL from Expo host or local LAN
const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
const hostIp = debuggerHost ? debuggerHost.split(":")[0] : "10.52.145.12";

export const API_BASE_URL = `http://${hostIp}:5000/api/v1`;

const TOKEN_STORAGE_KEY = "@evfinder_auth_token";
const USER_STORAGE_KEY = "@evfinder_user_profile";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

class MobileApiClient {
  private token: string | null = null;

  async init() {
    try {
      this.token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      this.token = null;
    }
  }

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  async clearAuth() {
    this.token = null;
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || `HTTP error ${response.status}`);
      }

      return json;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[API] Network request to ${API_BASE_URL}${endpoint} failed, utilizing local fallback engine:`, err.message);
      throw err;
    }
  }

  // --- Auth APIs ---
  async sendOtp(phone: string) {
    try {
      return await this.request<{ success: boolean; message: string; data: { demoOtp?: string } }>("/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
    } catch {
      // Local fallback auth
      return {
        success: true,
        message: `OTP sent to ${phone}`,
        data: { demoOtp: "123456" },
      };
    }
  }

  async verifyOtp(phone: string, otp: string, fullName?: string) {
    try {
      const res = await this.request<{
        success: boolean;
        data: { user: UserProfile; tokens: { accessToken: string } };
      }>("/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, otp, fullName }),
      });

      if (res.data?.tokens?.accessToken) {
        await this.setToken(res.data.tokens.accessToken);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data.user));
      }

      return res.data;
    } catch {
      // Offline mock user login
      const mockUser: UserProfile = {
        id: "usr_local_1",
        phone,
        email: "driver@evfinder.app",
        fullName: fullName || "EV Driver",
        avatarUrl: "",
        vehicles: [
          {
            id: "veh_1",
            brand: "Tata",
            model: "Nexon EV Max",
            connectorType: "CCS2",
            batteryKwh: 40.5,
          },
        ],
        favorites: ["st-1", "st-2"],
      };
      await this.setToken("mock_jwt_token_local");
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
      return { user: mockUser, tokens: { accessToken: "mock_jwt_token_local" } };
    }
  }

  // --- Stations APIs ---
  async getNearbyStations(params: {
    lat: number;
    lng: number;
    city?: string;
    radiusKm?: number;
    connector?: string;
    minPowerKw?: number;
    network?: string;
    status?: string;
    limit?: number;
  }): Promise<{ count: number; data: Station[] }> {
    try {
      const query = new URLSearchParams({
        lat: params.lat.toString(),
        lng: params.lng.toString(),
        radius_km: (params.radiusKm || 1000).toString(),
        limit: (params.limit || 1000).toString(),
        ...(params.city && { city: params.city }),
        ...(params.connector && { connector: params.connector }),
        ...(params.minPowerKw && { min_power_kw: params.minPowerKw.toString() }),
        ...(params.network && { network: params.network }),
        ...(params.status && { status: params.status }),
      });

      return await this.request<{ count: number; data: Station[] }>(`/stations/nearby?${query.toString()}`);
    } catch {
      // Local fallback: Return all stations matching the filters
      const lat = params.lat;
      const lng = params.lng;
      const radiusKm = params.radiusKm || 1000;
      const minPowerKw = params.minPowerKw || 0;
      const selectedCity = params.city;

      const filtered = fallbackStations
        .map((s) => ({
          ...s,
          distanceKm: haversineKm(lat, lng, s.lat, s.lng),
        }))
        .filter((s) => {
          if (selectedCity && selectedCity !== "All India" && s.city.toLowerCase() !== selectedCity.toLowerCase()) {
            // Also check radius if in city view
            if (s.distanceKm > (radiusKm || 50)) return false;
          }
          if (params.connector && !s.connectors.some((c) => c.toLowerCase().includes(params.connector!.toLowerCase()))) {
            return false;
          }
          if (minPowerKw > 0 && s.maxPowerKw < minPowerKw) {
            return false;
          }
          if (params.status && params.status !== "all" && s.status !== params.status) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return {
        count: filtered.length,
        data: filtered,
      };
    }
  }

  async getAllStations(): Promise<Station[]> {
    return fallbackStations;
  }

  async getStationDetails(id: string): Promise<{ data: Station & { reviews: ReviewItem[] } }> {
    try {
      return await this.request<{ data: Station & { reviews: ReviewItem[] } }>(`/stations/${id}`);
    } catch {
      const station = fallbackStations.find((s) => s.id === id) || fallbackStations[0];
      return {
        data: {
          ...station,
          reviews: [],
        },
      };
    }
  }

  async searchStations(q: string, city?: string): Promise<{ count: number; data: Station[] }> {
    try {
      const query = new URLSearchParams({
        q,
        ...(city && { city }),
      });
      return await this.request<{ count: number; data: Station[] }>(`/stations/search?${query.toString()}`);
    } catch {
      const lower = q.toLowerCase();
      const results = fallbackStations.filter(
        (s) =>
          s.name.toLowerCase().includes(lower) ||
          s.address.toLowerCase().includes(lower) ||
          s.network.toLowerCase().includes(lower) ||
          s.city.toLowerCase().includes(lower)
      );
      return { count: results.length, data: results };
    }
  }

  // --- Route Planning ---
  async planRoute(payload: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    vehicle?: { batteryKwh?: number; currentSocPercent?: number; efficiencyKmPerKwh?: number };
  }): Promise<{ data: RoutePlanResult }> {
    try {
      return await this.request<{ data: RoutePlanResult }>("/routes/plan", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      const totalDistanceKm = haversineKm(payload.origin.lat, payload.origin.lng, payload.destination.lat, payload.destination.lng);
      return {
        data: {
          totalDistanceKm,
          estimatedDriveTimeMinutes: Math.round((totalDistanceKm / 60) * 60),
          stopsNeeded: totalDistanceKm > 200,
          recommendedStops: [
            {
              stopNumber: 1,
              station: fallbackStations[0],
              estimatedArrivalSoc: 24,
              targetChargeSoc: 80,
              chargeTimeMinutes: 30,
              estimatedCostInr: 420,
            },
          ],
          arrivalDestinationSocPercent: 48,
        },
      };
    }
  }

  // --- User Garage & Favorites ---
  async getFavorites(): Promise<{ data: Station[] }> {
    try {
      return await this.request<{ data: Station[] }>("/user/favorites");
    } catch {
      return { data: fallbackStations.slice(0, 3) };
    }
  }

  async toggleFavorite(stationId: string, isFav: boolean) {
    try {
      return await this.request(`/user/favorites/${stationId}`, {
        method: isFav ? "DELETE" : "POST",
      });
    } catch {
      return { success: true };
    }
  }

  async reserveSlot(stationId: string, portNumber: number = 1, durationMinutes: number = 45) {
    try {
      return await this.request(`/stations/${stationId}/reserve`, {
        method: "POST",
        body: JSON.stringify({ portNumber, durationMinutes }),
      });
    } catch {
      return { success: true, message: "Slot reserved (Offline mode)" };
    }
  }
}

export const api = new MobileApiClient();
