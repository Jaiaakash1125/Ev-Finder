/**
 * Typed client for the India EV Finder REST API (backend/api-server.ts).
 *
 *  - Tokens live in the OS keychain/keystore via expo-secure-store, never AsyncStorage.
 *  - The access token is attached automatically; on a 401 the client refreshes once (shared
 *    between concurrent requests) and retries. If the refresh token is rejected the session is
 *    cleared and `onSessionExpired` listeners fire so the UI can show the login screen.
 *
 * Usage
 *   await session.restore();                    // once at app start
 *   await auth.sendOtp("+919876543210");
 *   const { user } = await auth.verifyOtp("+919876543210", "123456", "Asha");
 *   const nearby = await stations.nearby({ lat, lng, radius_km: 10 });
 *
 * Configure the base URL with EXPO_PUBLIC_API_URL (e.g. https://api.example.com/api/v1).
 * In development it falls back to port 5000 on the machine running Expo.
 */
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import type {
  AuthTokens,
  Booking,
  LoginResult,
  Page,
  ReviewItem,
  RoutePlanResult,
  Station,
  StationDetail,
  StationFilters,
  UserProfile,
  Vehicle,
} from "../types";

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) {
    if (!__DEV__ && !configured.startsWith("https://")) {
      throw new Error("EXPO_PUBLIC_API_URL must use https:// in release builds");
    }
    return configured.replace(/\/+$/, "");
  }
  if (!__DEV__) throw new Error("EXPO_PUBLIC_API_URL is not set");
  const host = Constants.expoConfig?.hostUri?.split(":")[0] ?? "localhost";
  return `http://${host}:5000/api/v1`;
}

export const API_BASE_URL = resolveBaseUrl();
const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Every failed call throws this. `code` matches the server's error codes, or NETWORK_ERROR / TIMEOUT. */
export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }

  get isNetworkError() {
    return this.code === "NETWORK_ERROR" || this.code === "TIMEOUT";
  }
}

// ---------------------------------------------------------------------------
// Session (token storage)
// ---------------------------------------------------------------------------

const ACCESS_KEY = "evf.accessToken";
const REFRESH_KEY = "evf.refreshToken";

let accessToken: string | null = null;
let refreshToken: string | null = null;
const expiryListeners = new Set<() => void>();

export const session = {
  /** Load saved tokens from secure storage. Call once on app start; returns true if a login exists. */
  async restore(): Promise<boolean> {
    try {
      [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);
    } catch {
      accessToken = refreshToken = null;
    }
    return refreshToken !== null;
  },

  isSignedIn: () => refreshToken !== null,

  async save(tokens: Pick<AuthTokens, "accessToken" | "refreshToken">) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
    ]);
  },

  async clear() {
    accessToken = refreshToken = null;
    await Promise.allSettled([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },

  /** Fires when the server rejects the refresh token (revoked, expired, or reuse detected). */
  onSessionExpired(listener: () => void) {
    expiryListeners.add(listener);
    return () => {
      expiryListeners.delete(listener);
    };
  },
};

// ---------------------------------------------------------------------------
// HTTP core
// ---------------------------------------------------------------------------

type AuthMode = "required" | "optional" | "none";
interface RequestOptions {
  body?: unknown;
  query?: object;
  auth?: AuthMode;
}
interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: Page & Record<string, unknown>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const qs = Object.entries((query ?? {}) as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function rawRequest(
  method: string,
  path: string,
  opts: RequestOptions,
  token: string | null,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token && opts.auth !== "none") headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      signal: controller.signal,
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ApiRequestError(
      0,
      aborted ? "TIMEOUT" : "NETWORK_ERROR",
      aborted ? "The server took too long to respond" : "Could not reach the server",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page from a proxy, etc. */
  }
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      json?.error?.code ?? "HTTP_ERROR",
      json?.error?.message ?? `Request failed (${res.status})`,
      json?.error?.details,
      json?.requestId,
    );
  }
  return json as Envelope<any> | null;
}

let refreshInFlight: Promise<void> | null = null;

/** Exchange the refresh token for new tokens. Concurrent callers share one network call. */
function refreshSession(): Promise<void> {
  refreshInFlight ??= (async () => {
    if (!refreshToken) throw new ApiRequestError(401, "UNAUTHENTICATED", "Not signed in");
    try {
      const res = await rawRequest(
        "POST",
        "/auth/refresh",
        { auth: "none", body: { refreshToken } },
        null,
      );
      await session.save(res!.data.tokens);
    } catch (err) {
      // Only a definitive rejection ends the login; a dropped connection must not log the user out.
      if (err instanceof ApiRequestError && (err.status === 401 || err.status === 400)) {
        await session.clear();
        expiryListeners.forEach((fn) => fn());
      }
      throw err;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

const REFRESHABLE = new Set(["TOKEN_EXPIRED", "INVALID_TOKEN", "UNAUTHENTICATED"]);

async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<{ data: T; meta?: Envelope<T>["meta"] }> {
  const auth = opts.auth ?? "none";
  const options = { ...opts, auth };
  try {
    const res = await rawRequest(method, path, options, accessToken);
    return { data: res?.data as T, ...(res?.meta ? { meta: res.meta } : {}) };
  } catch (err) {
    const canRefresh =
      auth !== "none" &&
      refreshToken !== null &&
      err instanceof ApiRequestError &&
      err.status === 401 &&
      REFRESHABLE.has(err.code);
    if (!canRefresh) {
      if (
        auth === "required" &&
        err instanceof ApiRequestError &&
        err.status === 401 &&
        !refreshToken
      ) {
        expiryListeners.forEach((fn) => fn());
      }
      throw err;
    }
    await refreshSession(); // throws if the session is really over
    const res = await rawRequest(method, path, options, accessToken);
    return { data: res?.data as T, ...(res?.meta ? { meta: res.meta } : {}) };
  }
}

const get = <T>(path: string, query?: RequestOptions["query"], auth: AuthMode = "optional") =>
  request<T>("GET", path, { ...(query ? { query } : {}), auth });

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export const auth = {
  /** Sends a 6-digit SMS code. `phone` must be E.164, e.g. +919876543210. */
  sendOtp: async (phone: string) =>
    (
      await request<{ phone: string; expiresInSeconds: number; resendAfterSeconds: number }>(
        "POST",
        "/auth/otp/send",
        { body: { phone } },
      )
    ).data,

  /** Verifies the code, stores the tokens securely, and returns the user. */
  async verifyOtp(phone: string, otp: string, fullName?: string): Promise<LoginResult> {
    const { data } = await request<LoginResult>("POST", "/auth/otp/verify", {
      body: { phone, otp, ...(fullName ? { fullName } : {}) },
    });
    await session.save(data.tokens);
    return data;
  },

  /** Ends this login on the server and wipes local tokens. Always clears locally, even offline. */
  async logout() {
    const token = refreshToken;
    try {
      if (token) await request("POST", "/auth/logout", { body: { refreshToken: token } });
    } finally {
      await session.clear();
    }
  },
};

export const user = {
  profile: async () => (await get<UserProfile>("/user/profile", undefined, "required")).data,
  updateProfile: async (patch: {
    fullName?: string;
    email?: string | null;
    avatarUrl?: string | null;
  }) =>
    (await request<UserProfile>("PUT", "/user/profile", { body: patch, auth: "required" })).data,
  /** Permanently deletes the account (required by the App Store and Play Store for apps with sign-up). */
  async deleteAccount() {
    await request("DELETE", "/user/account", { auth: "required" });
    await session.clear();
  },

  vehicles: async () => (await get<Vehicle[]>("/user/vehicles", undefined, "required")).data,
  addVehicle: async (v: Omit<Vehicle, "id">) =>
    (await request<Vehicle>("POST", "/user/vehicles", { body: v, auth: "required" })).data,
  updateVehicle: async (id: string, v: Omit<Vehicle, "id">) =>
    (
      await request<Vehicle>("PUT", `/user/vehicles/${encodeURIComponent(id)}`, {
        body: v,
        auth: "required",
      })
    ).data,
  removeVehicle: async (id: string) => {
    await request("DELETE", `/user/vehicles/${encodeURIComponent(id)}`, { auth: "required" });
  },

  favorites: async () => (await get<Station[]>("/user/favorites", undefined, "required")).data,
  addFavorite: async (stationId: string) => {
    await request("POST", `/user/favorites/${encodeURIComponent(stationId)}`, { auth: "required" });
  },
  removeFavorite: async (stationId: string) => {
    await request("DELETE", `/user/favorites/${encodeURIComponent(stationId)}`, {
      auth: "required",
    });
  },
};

export const stations = {
  async nearby(
    q: { lat: number; lng: number; radius_km?: number; limit?: number } & StationFilters,
  ) {
    const { data, meta } = await get<Station[]>("/stations/nearby", q);
    return { stations: data, meta };
  },
  /** For the map: pass the visible region. Check `meta.truncated` and ask the user to zoom in. */
  async inBounds(
    q: {
      min_lat: number;
      min_lng: number;
      max_lat: number;
      max_lng: number;
      limit?: number;
    } & StationFilters,
  ) {
    const { data, meta } = await get<Station[]>("/stations/bounds", q);
    return { stations: data, meta };
  },
  async search(q: {
    q?: string;
    city?: string;
    lat?: number;
    lng?: number;
    limit?: number;
    offset?: number;
  }) {
    const { data, meta } = await get<Station[]>("/stations/search", q);
    return { stations: data, meta };
  },
  detail: async (id: string) =>
    (await get<StationDetail>(`/stations/${encodeURIComponent(id)}`)).data,

  async reviews(id: string, page: { limit?: number; offset?: number } = {}) {
    const { data, meta } = await get<ReviewItem[]>(
      `/stations/${encodeURIComponent(id)}/reviews`,
      page,
      "none",
    );
    return { reviews: data, meta };
  },
  addReview: async (
    id: string,
    review: { rating: number; comment?: string; plugCondition?: ReviewItem["plugCondition"] },
  ) =>
    (
      await request<ReviewItem>("POST", `/stations/${encodeURIComponent(id)}/reviews`, {
        body: review,
        auth: "required",
      })
    ).data,
};

export const bookings = {
  reserve: async (
    stationId: string,
    opts: { portNumber?: number; startTimeMinutesFromNow?: number; durationMinutes?: number } = {},
  ) =>
    (
      await request<Booking>("POST", `/stations/${encodeURIComponent(stationId)}/reserve`, {
        body: opts,
        auth: "required",
      })
    ).data,
  mine: async (status?: Booking["status"]) =>
    (await get<Booking[]>("/bookings/my", status ? { status } : undefined, "required")).data,
  cancel: async (id: string) =>
    (await request<Booking>("DELETE", `/bookings/${encodeURIComponent(id)}`, { auth: "required" }))
      .data,
};

export const routes = {
  plan: async (input: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    vehicle?: {
      batteryKwh?: number;
      currentSocPercent?: number;
      efficiencyKmPerKwh?: number;
      maxChargeKw?: number;
      connector?: string;
    };
  }) =>
    (await request<RoutePlanResult>("POST", "/routes/plan", { body: input, auth: "optional" }))
      .data,
};

export const evApi = { auth, user, stations, bookings, routes, session };
