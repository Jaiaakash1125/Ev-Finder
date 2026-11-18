import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Station } from "../types";

const STATIONS_CACHE_KEY = "ev_finder:last_stations_v1";
const MAX_CACHED_STATIONS = 60;

export interface CachedStationsPayload {
  stations: Station[];
  total: number;
  savedAt: string;
}

export async function saveCachedStations(stations: Station[], total?: number): Promise<void> {
  if (!Array.isArray(stations) || stations.length === 0) return;

  const payload: CachedStationsPayload = {
    stations: stations.slice(0, MAX_CACHED_STATIONS),
    total: typeof total === "number" ? total : stations.length,
    savedAt: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(STATIONS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures (e.g. quota exceeded)
  }
}

export async function loadCachedStations(): Promise<CachedStationsPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(STATIONS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedStationsPayload>;
    if (!Array.isArray(parsed.stations) || parsed.stations.length === 0) {
      return null;
    }

    return {
      stations: parsed.stations,
      total: typeof parsed.total === "number" ? parsed.total : parsed.stations.length,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    };
  } catch {
    return null;
  }
}
