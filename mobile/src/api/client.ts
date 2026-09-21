import AsyncStorage from "@react-native-async-storage/async-storage";
import { Station, UserProfile, RoutePlanResult, ReviewItem } from "../types";

// Default API endpoint - for local emulator or live backend
// Use 10.0.2.2 for Android Emulator, localhost for iOS simulator, or your local machine LAN IP
export const API_BASE_URL = "http://10.0.2.2:5000/api/v1";

const TOKEN_STORAGE_KEY = "@evfinder_auth_token";
const USER_STORAGE_KEY = "@evfinder_user_profile";

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

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || `HTTP error ${response.status}`);
      }

      return json;
    } catch (err: any) {
      console.warn(`[API] Error on ${endpoint}:`, err.message);
      throw err;
    }
  }

  // --- Auth APIs ---
  async sendOtp(phone: string) {
    return this.request<{ success: boolean; message: string; data: { demoOtp?: string } }>("/auth/otp/send", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, otp: string, fullName?: string) {
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
  }

  // --- Stations APIs ---
  async getNearbyStations(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    connector?: string;
    minPowerKw?: number;
    network?: string;
    status?: string;
    limit?: number;
  }): Promise<{ count: number; data: Station[] }> {
    const query = new URLSearchParams({
      lat: params.lat.toString(),
      lng: params.lng.toString(),
      radius_km: (params.radiusKm || 50).toString(),
      limit: (params.limit || 100).toString(),
      ...(params.connector && { connector: params.connector }),
      ...(params.minPowerKw && { min_power_kw: params.minPowerKw.toString() }),
      ...(params.network && { network: params.network }),
      ...(params.status && { status: params.status }),
    });

    return this.request<{ count: number; data: Station[] }>(`/stations/nearby?${query.toString()}`);
  }

  async getStationDetails(id: string): Promise<{ data: Station & { reviews: ReviewItem[] } }> {
    return this.request<{ data: Station & { reviews: ReviewItem[] } }>(`/stations/${id}`);
  }

  async searchStations(q: string, city?: string): Promise<{ count: number; data: Station[] }> {
    const query = new URLSearchParams({
      q,
      ...(city && { city }),
    });
    return this.request<{ count: number; data: Station[] }>(`/stations/search?${query.toString()}`);
  }

  // --- Route Planning ---
  async planRoute(payload: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    vehicle?: { batteryKwh?: number; currentSocPercent?: number; efficiencyKmPerKwh?: number };
  }): Promise<{ data: RoutePlanResult }> {
    return this.request<{ data: RoutePlanResult }>("/routes/plan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // --- User Garage & Favorites ---
  async getFavorites(): Promise<{ data: Station[] }> {
    return this.request<{ data: Station[] }>("/user/favorites");
  }

  async toggleFavorite(stationId: string, isFav: boolean) {
    return this.request(`/user/favorites/${stationId}`, {
      method: isFav ? "DELETE" : "POST",
    });
  }

  async reserveSlot(stationId: string, portNumber: number = 1, durationMinutes: number = 45) {
    return this.request(`/stations/${stationId}/reserve`, {
      method: "POST",
      body: JSON.stringify({ portNumber, durationMinutes }),
    });
  }
}

export const api = new MobileApiClient();
