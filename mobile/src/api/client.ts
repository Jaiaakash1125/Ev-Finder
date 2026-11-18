import { cityCoordinates } from "../constants/cities";
import { API_BASE_URL } from "./config";
import {
  api as stationsApi,
  ApiError,
  checkApiHealth,
  fetchCities,
  fetchNearbyStations,
  fetchStationById,
  fetchStationReviews,
  fetchStations,
  fetchStationsInBounds,
  getErrorMessage,
  isAbortError,
  normalizeStation,
  postStationReview,
  searchStations,
  type BoundsParams,
  type CreateReviewInput,
  type FetchStationsParams,
  type FetchStationsResult,
  type HealthResponse,
  type NearbyStationsParams,
} from "./stationsApi";

export {
  API_BASE_URL,
  ApiError,
  checkApiHealth,
  fetchCities,
  fetchNearbyStations,
  fetchStationById,
  fetchStationReviews,
  fetchStations,
  fetchStationsInBounds,
  getErrorMessage,
  isAbortError,
  normalizeStation,
  postStationReview,
  searchStations,
  stationsApi,
  type BoundsParams,
  type CreateReviewInput,
  type FetchStationsParams,
  type FetchStationsResult,
  type HealthResponse,
  type NearbyStationsParams,
};

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

  if (lat && lng && !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0) {
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
    let c = rawCity.trim().replace(/^[0-9\-+\s]+/, "").trim();
    if (c.includes(",")) c = c.split(",")[0]?.trim() || "";
    if (c.includes(":")) c = c.split(":")[0]?.trim() || "";
    if (c.length > 2 && c.length <= 25) {
      return c;
    }
  }

  return "Bengaluru";
}

export const api = {
  ...stationsApi,
  init: async () => {},
  getNearbyStations: fetchNearbyStations,
  getStationById: fetchStationById,
};

export default api;
