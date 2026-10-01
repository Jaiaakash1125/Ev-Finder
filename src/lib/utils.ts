import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Robust, fuzzy connector matching for all Indian EV standards and variants
 */
export function matchesConnector(
  stationConnectors: string[] | undefined,
  target: string | undefined,
  stationNetwork?: string
): boolean {
  if (!target) return true;
  if (!stationConnectors || stationConnectors.length === 0) {
    return true;
  }

  const cleanTarget = target.trim().toLowerCase().replace(/[\s\-_/]/g, "");

  return stationConnectors.some((rawConn) => {
    const conn = rawConn.trim().toLowerCase().replace(/[\s\-_/]/g, "");

    // Exact or direct inclusion
    if (conn === cleanTarget || conn.includes(cleanTarget) || cleanTarget.includes(conn)) {
      return true;
    }

    // CCS2 / Combo 2 / DC Fast
    if (
      (cleanTarget.includes("ccs") || cleanTarget === "ccs2" || cleanTarget.includes("combo")) &&
      (conn.includes("ccs") || conn.includes("combo"))
    ) {
      return true;
    }

    // Type 2 AC / Mennekes
    if (
      (cleanTarget.includes("type2") || cleanTarget.includes("mennekes")) &&
      (conn.includes("type2") || conn.includes("mennekes"))
    ) {
      return true;
    }

    // GB/T / Bharat DC-001 / GBT / DC-001
    if (
      (cleanTarget.includes("gbt") || cleanTarget.includes("bharatdc") || cleanTarget.includes("dc001")) &&
      (conn.includes("gbt") || conn.includes("bharatdc") || conn.includes("dc001"))
    ) {
      return true;
    }

    // 15A Socket / Bharat AC-001 / 3-Pin / Standard Wall Socket
    if (
      (cleanTarget.includes("15a") || cleanTarget.includes("bharatac") || cleanTarget.includes("ac001") || cleanTarget.includes("socket") || cleanTarget.includes("3pin")) &&
      (conn.includes("15a") || conn.includes("bharatac") || conn.includes("ac001") || conn.includes("socket"))
    ) {
      return true;
    }

    // LECCS / Light EV / Ather / 2-wheeler
    if (
      (cleanTarget.includes("leccs") || cleanTarget.includes("ather") || cleanTarget.includes("lightev")) &&
      (conn.includes("leccs") || conn.includes("bharatac") || conn.includes("type2") || (stationNetwork && stationNetwork.toLowerCase().includes("ather")))
    ) {
      return true;
    }

    // CHAdeMO
    if (cleanTarget.includes("chademo") && conn.includes("chademo")) {
      return true;
    }

    return false;
  });
}

/**
 * Calculates Haversine distance in Kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Finds the closest major Indian city to the user's coordinates
 */
export function getClosestCity(
  lat: number,
  lng: number,
  coordsMap: Record<string, { lat: number; lng: number }>
): string {
  let closestCity = "Bengaluru";
  let minDistance = Infinity;

  for (const [cityName, coords] of Object.entries(coordsMap)) {
    const dist = calculateDistanceKm(lat, lng, coords.lat, coords.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestCity = cityName;
    }
  }

  return closestCity;
}

