import { TOP_CITIES, MAJOR_CITIES } from "../constants/cities";

// Words that indicate an address, street, sector, or non-city entity
const ADDRESS_KEYWORDS =
  /\b(rd|road|street|st|ln|lane|marg|ave|avenue|highway|bypass|circle|junction|cross|chowk|sector|plot|survey|sy|block|floor|gate|colony|layout|enclave|phase|part|beside|opposite|opp|near|behind|next|temple|hospital|hotel|mall|resort|outlet|pump|petrol|retail|bpcl|hpcl|iocl|tms|complex|area|bazaar)\b/i;

// Legit cities that end with 'nagar' or have special names
const ALLOWED_NAGAR_CITIES = new Set([
  "ahilyanagar",
  "ahmednagar",
  "bhavnagar",
  "chhatrapati sambhajinagar",
  "gandhinagar",
  "hanumangarh",
  "muzaffarnagar",
  "sri ganganagar",
  "surendranagar",
  "yamunanagar",
]);

/**
 * Validates whether a raw string from the database is a genuine city name.
 * Discards corrupted strings with question marks, plot numbers, plus codes,
 * street addresses, and local colony/sector names.
 */
export function isValidCityName(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 30) return false;

  // Reject question marks, plus codes, symbols
  if (/[?+@#$%\^&*_=~`<>{}\[\]|\\]/.test(trimmed)) return false;

  // Reject any number/digit (e.g., plot numbers, pin codes, sector numbers, coordinates)
  if (/\d/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (lower === "all india") return false; // Handled separately as root option

  // Check for standalone "nagar" (colonies / neighborhoods) vs legitimate city names
  if (lower.includes("nagar") && !ALLOWED_NAGAR_CITIES.has(lower) && /\bnagar\b/i.test(lower)) {
    return false;
  }

  // Check for address words
  if (ADDRESS_KEYWORDS.test(lower)) {
    return false;
  }

  return true;
}

/**
 * Sanitizes and deduplicates a list of raw city strings, guaranteeing
 * that only genuine city names are returned. Puts TOP_CITIES first,
 * followed by all other cities sorted alphabetically.
 */
export function cleanCityList(rawCities: string[]): string[] {
  if (!Array.isArray(rawCities)) return [...TOP_CITIES];

  const validSet = new Set<string>();

  for (const item of rawCities) {
    if (isValidCityName(item)) {
      const normalized = item.trim().replace(/\s+/g, " ");
      validSet.add(normalized);
    }
  }

  // Ensure all major/top cities from constants exist in the list
  for (const c of TOP_CITIES) {
    validSet.add(c);
  }
  for (const c of MAJOR_CITIES) {
    validSet.add(c);
  }

  const topSet = new Set(TOP_CITIES);
  const remaining = Array.from(validSet)
    .filter((c) => !topSet.has(c))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

  return [...TOP_CITIES, ...remaining];
}
