import { stations as fallbackStations, Station, cityCoordinates } from "../data/stations";
import Constants from "expo-constants";
import {
  fetchStations as apiFetchStations,
  fetchNearbyStations,
  fetchStationById,
  searchStations,
  normalizeStation,
  stationsApi,
  FetchStationsResult,
  FetchStationsParams,
  API_BASE_URLS,
} from "./stationsApi";

export {
  normalizeStation,
  stationsApi,
  fetchNearbyStations,
  fetchStationById,
  searchStations,
  FetchStationsResult,
  FetchStationsParams,
  API_BASE_URLS,
};

// Dynamically determine host IP so mobile phones on Wi-Fi can reach the computer's XAMPP server
const debuggerHost =
  Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
const hostIp = debuggerHost ? debuggerHost.split(":")[0] : "10.52.145.12";

// Server API endpoints on host machine (REST API v1 endpoints)
export const XAMPP_API_URLS = [
  `http://${hostIp}/api/v1/stations`,
  `http://localhost/api/v1/stations`,
  `http://${hostIp}:5000/api/v1/stations`,
  `http://localhost:5000/api/v1/stations`,
];

// Mapping of substrings/districts/aliases to clean major cities
const CITY_NAME_MAP: [RegExp, string][] = [
  [/bengaluru|bangalore/i, "Bengaluru"],
  [/mumbai|bombay|navi mumbai|thane|borivali|andheri|nariman/i, "Mumbai"],
  [/new delhi|delhi|noida|greater noida|gurugram|gurgaon|faridabad|ghaziabad|dwarka|saket|connaught/i, "New Delhi"],
  [/hyderabad|secunderabad|gachibowli|hitec city/i, "Hyderabad"],
  [/chennai|madras|guindy|omr|velachery/i, "Chennai"],
  [/pune|pimpri|chinchwad|hinjewadi|wakad|baner/i, "Pune"],
  [/kolkata|calcutta|howrah|salt lake|new town/i, "Kolkata"],
  [/ahmedabad|gandhinagar|sg highway/i, "Ahmedabad"],
  [/jaipur|mansarovar|vaishali nagar/i, "Jaipur"],
  [/kochi|cochin|ernakulam|kakkanad|edappally/i, "Kochi"],
  [/chandigarh|mohali|panchkula/i, "Chandigarh"],
  [/lucknow|gomti nagar|hazratganj/i, "Lucknow"],
  [/surat/i, "Surat"],
  [/indore/i, "Indore"],
  [/coimbatore/i, "Coimbatore"],
  [/goa|panaji|margao|calangute|candolim|mapusa|vasco/i, "Goa"],
  [/nagpur/i, "Nagpur"],
  [/vadodara|baroda/i, "Vadodara"],
  [/bhopal/i, "Bhopal"],
  [/visakhapatnam|vizag/i, "Visakhapatnam"],
  [/patna/i, "Patna"],
  [/agra/i, "Agra"],
  [/varanasi|banaras|kashi/i, "Varanasi"],
  [/amritsar/i, "Amritsar"],
  [/bhubaneswar|cuttack/i, "Bhubaneswar"],
  [/guwahati/i, "Guwahati"],
  [/dehradun/i, "Dehradun"],
  [/thiruvananthapuram|trivandrum/i, "Thiruvananthapuram"],
  [/mysore|mysuru/i, "Mysore"],
  [/mangalore|mangaluru/i, "Mangalore"],
  [/ludhiana/i, "Ludhiana"],
  [/kanpur/i, "Kanpur"],
  [/nashik/i, "Nashik"],
  [/rajkot/i, "Rajkot"],
  [/vijayawada/i, "Vijayawada"],
  [/madurai/i, "Madurai"],
  [/raipur/i, "Raipur"],
  [/ranchi/i, "Ranchi"],
  [/jodhpur/i, "Jodhpur"],
  [/udaipur/i, "Udaipur"],
];

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function cleanCityName(
  rawCity: string,
  rawAddress: string,
  rawName: string,
  lat?: number,
  lng?: number
): string {
  const combined = `${rawCity || ""} ${rawAddress || ""} ${rawName || ""}`;

  for (const [regex, cleanName] of CITY_NAME_MAP) {
    if (regex.test(combined)) {
      return cleanName;
    }
  }

  if (lat && lng && !isNaN(lat) && !isNaN(lng) && lat !== 0) {
    let closestCity = "";
    let minDistance = 45;

    for (const [cityName, coords] of Object.entries(cityCoordinates)) {
      const dist = getDistanceKm(lat, lng, coords.lat, coords.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestCity = cityName;
      }
    }

    if (closestCity) {
      return closestCity;
    }
  }

  if (rawCity) {
    let c = rawCity.trim();
    c = c.replace(/^[0-9\-\+\s]+/, "").trim();
    if (c.includes(",")) c = c.split(",")[0]?.trim() || "";
    if (c.includes(":")) c = c.split(":")[0]?.trim() || "";
    if (
      c.length > 20 ||
      /dealer|service|station|industrial|highway|toll|sector|opposite|petroleum/i.test(c)
    ) {
      if (rawAddress) {
        const parts = rawAddress
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i] || "";
          if (
            part.length > 2 &&
            part.length < 20 &&
            !/^\d+$/.test(part) &&
            !/india/i.test(part)
          ) {
            return part;
          }
        }
      }
    }
    if (c.length > 2 && c.length <= 25) {
      return c;
    }
  }

  return "Bengaluru";
}

/**
 * Fetch all EV stations using the new /api/v1/stations REST API endpoint,
 * with graceful fallback to local offline dataset if offline.
 */
export async function fetchStations(params?: FetchStationsParams): Promise<FetchStationsResult> {
  return await apiFetchStations(params);
}

export const api = {
  init: async () => {},
  getStations: fetchStations,
  getNearbyStations: fetchNearbyStations,
  getStationById: fetchStationById,
  searchStations: searchStations,
};

export default api;
