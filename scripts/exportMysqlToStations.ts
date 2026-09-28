import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

function parseConnectors(rawConnectors: string): string[] {
  if (!rawConnectors || rawConnectors.trim() === "") return ["CCS2", "Type 2 AC"];
  const list: string[] = [];
  const lower = rawConnectors.toLowerCase();

  if (lower.includes("ccs") || lower.includes("ccs2") || lower.includes("ccs-2")) list.push("CCS2");
  if (lower.includes("type 2") || lower.includes("type2") || lower.includes("ac type 2")) list.push("Type 2 AC");
  if (lower.includes("chademo")) list.push("CHAdeMO");
  if (lower.includes("bharat dc") || lower.includes("gb/t") || lower.includes("gbt")) list.push("Bharat DC-001");
  if (lower.includes("bharat ac") || lower.includes("ac-001")) list.push("Bharat AC-001");
  if (lower.includes("ather")) list.push("Ather Dot");
  if (lower.includes("wall") || lower.includes("15a") || lower.includes("3 pin")) list.push("Wall Socket (15A)");

  return list.length > 0 ? Array.from(new Set(list)) : ["CCS2", "Type 2 AC"];
}

function parseCapacity(rawCapacity: string, rawConnectors: string, name: string): number {
  const text = `${rawCapacity || ""} ${rawConnectors || ""} ${name || ""}`;
  const matches = text.match(/(\d+)\s*(?:kw|kw\/h)/gi);
  if (matches && matches.length > 0) {
    const nums = matches.map((m) => parseInt(m.replace(/\D/g, ""), 10)).filter((n) => n > 0 && n <= 500);
    if (nums.length > 0) {
      return Math.max(...nums);
    }
  }
  return 60;
}

function cleanCity(rawCity: string, address: string, name: string): string {
  const text = `${rawCity || ""} ${address || ""} ${name || ""}`.toLowerCase();
  if (/bengaluru|bangalore/i.test(text)) return "Bengaluru";
  if (/mumbai|bombay|navi mumbai|thane|borivali|andheri/i.test(text)) return "Mumbai";
  if (/new delhi|delhi|noida|greater noida|gurugram|gurgaon|faridabad|ghaziabad/i.test(text)) return "New Delhi";
  if (/hyderabad|secunderabad|gachibowli|hitec/i.test(text)) return "Hyderabad";
  if (/chennai|madras|guindy|omr|velachery/i.test(text)) return "Chennai";
  if (/pune|pimpri|chinchwad|hinjewadi/i.test(text)) return "Pune";
  if (/kolkata|calcutta|howrah|salt lake/i.test(text)) return "Kolkata";
  if (/ahmedabad|gandhinagar/i.test(text)) return "Ahmedabad";
  if (/jaipur/i.test(text)) return "Jaipur";
  if (/kochi|cochin|ernakulam/i.test(text)) return "Kochi";
  if (/chandigarh|mohali|panchkula/i.test(text)) return "Chandigarh";
  if (/lucknow/i.test(text)) return "Lucknow";
  if (/surat/i.test(text)) return "Surat";
  if (/indore/i.test(text)) return "Indore";
  if (/coimbatore/i.test(text)) return "Coimbatore";
  if (/goa|panaji|margao|calangute/i.test(text)) return "Goa";
  if (/nagpur/i.test(text)) return "Nagpur";
  if (/vadodara|baroda/i.test(text)) return "Vadodara";
  if (/bhopal/i.test(text)) return "Bhopal";
  if (/visakhapatnam|vizag/i.test(text)) return "Visakhapatnam";
  if (/patna/i.test(text)) return "Patna";
  if (/agra/i.test(text)) return "Agra";
  if (/varanasi|banaras/i.test(text)) return "Varanasi";
  if (/amritsar/i.test(text)) return "Amritsar";
  if (/bhubaneswar|cuttack/i.test(text)) return "Bhubaneswar";
  if (/guwahati/i.test(text)) return "Guwahati";
  if (/dehradun/i.test(text)) return "Dehradun";
  if (/thiruvananthapuram|trivandrum/i.test(text)) return "Thiruvananthapuram";
  if (/mysore|mysuru/i.test(text)) return "Mysore";
  if (/mangalore|mangaluru/i.test(text)) return "Mangalore";
  if (/ludhiana/i.test(text)) return "Ludhiana";
  if (/kanpur/i.test(text)) return "Kanpur";
  if (/nashik/i.test(text)) return "Nashik";
  if (/rajkot/i.test(text)) return "Rajkot";
  if (/vijayawada/i.test(text)) return "Vijayawada";
  if (/madurai/i.test(text)) return "Madurai";
  if (/raipur/i.test(text)) return "Raipur";
  if (/ranchi/i.test(text)) return "Ranchi";
  if (/jodhpur/i.test(text)) return "Jodhpur";
  if (/udaipur/i.test(text)) return "Udaipur";

  if (rawCity && rawCity.trim().length > 2 && rawCity.trim().length <= 25) {
    let c = rawCity.trim();
    if (c.includes(",")) c = c.split(",")[0].trim();
    return c.charAt(0).toUpperCase() + c.slice(1);
  }
  return "All India";
}

function extractPincode(address: string): string {
  const match = address.match(/\b[1-9][0-9]{5}\b/);
  return match ? match[0] : "";
}

function cleanNetwork(rawNetwork: string, name: string): string {
  if (rawNetwork && rawNetwork.trim() && !/unknown|null|none/i.test(rawNetwork)) {
    const net = rawNetwork.trim();
    if (/charge\s*zone/i.test(net)) return "Charge Zone";
    if (/jio/i.test(net)) return "Jio-bp pulse";
    if (/tata/i.test(net)) return "Tata Power EZ Charge";
    if (/statiq/i.test(net)) return "Statiq";
    if (/ather/i.test(net)) return "Ather Grid";
    if (/bpcl/i.test(net)) return "BPCL e-Drive";
    if (/zeon/i.test(net)) return "Zeon Charging";
    if (/bolt/i.test(net)) return "Bolt.Earth";
    if (/relux/i.test(net)) return "Relux Electric";
    if (/kazam/i.test(net)) return "Kazam EV";
    if (/glida|fortum/i.test(net)) return "GLIDA";
    if (/shell/i.test(net)) return "Shell Recharge";
    if (/hpcl/i.test(net)) return "HPCL EV Charge";
    if (/iocl/i.test(net)) return "IOCL EV Power";
    return net;
  }
  return "Public Charging Network";
}

async function exportFromMysql() {
  console.log("Fetching all records from MySQL `csv_db 7`.`ev_data_india_enriched`...");

  const query = "USE `csv_db 7`; SELECT * FROM `ev_data_india_enriched`;";
  const rawOutput = execSync(`"C:\\xampp\\mysql\\bin\\mysql.exe" -u root -e "${query.replace(/"/g, '\\"')}" --batch`, {
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024,
  });

  const lines = rawOutput.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) {
    throw new Error("No rows returned from MySQL!");
  }

  // Header row in batch mode is tab-separated column names
  const headers = lines[0].split("\t");
  console.log(`Headers detected: ${headers.join(", ")}`);
  console.log(`Total rows in MySQL table: ${lines.length - 1}`);

  const stations: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || "";
    });

    const col1 = row["COL 1"] || row["place_id"] || "";
    const col2 = row["COL 2"] || row["latitude"] || "";
    const col3 = row["COL 3"] || row["longitude"] || "";

    // Skip header row if imported as data
    if (col1.toLowerCase() === "place_id" || col2.toLowerCase() === "latitude") {
      continue;
    }

    const lat = parseFloat(col2);
    const lng = parseFloat(col3);

    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      continue;
    }

    const rawNet = row["COL 4"] || row["charging_network"] || "";
    const rawName = row["COL 5"] || row["name"] || "EV Charging Station";
    const rawCity = row["COL 6"] || row["city"] || "";
    const rawState = row["COL 7"] || row["state"] || "India";
    const rawAddr = row["COL 8"] || row["address"] || "";
    const gmapsLink = row["COL 9"] || row["google_maps_link"] || "";
    const rawConnectors = row["COL 10"] || row["connector_types"] || "";
    const rawCap = row["COL 11"] || row["charging_capacity"] || "";

    const name = rawName.trim();
    const city = cleanCity(rawCity, rawAddr, name);
    const network = cleanNetwork(rawNet, name);
    const connectors = parseConnectors(rawConnectors);
    const maxPowerKw = parseCapacity(rawCap, rawConnectors, name);
    const pincode = extractPincode(rawAddr);
    const id = col1 || `station-${i}`;

    const hash = Math.abs(Math.floor(lat * 1000 + lng * 1000));
    const totalPorts = 2 + (hash % 6);
    const freePorts = hash % (totalPorts + 1);
    const pricePerKwh = Number((9.5 + (hash % 40) / 10).toFixed(2));
    const rating = Number((3.8 + (hash % 12) / 10).toFixed(1));
    const reviews = 15 + (hash % 350);
    const status = freePorts === 0 ? "busy" : freePorts === 1 ? "limited" : "available";

    stations.push({
      id,
      name,
      network,
      city,
      state: rawState || "India",
      address: rawAddr || `${name}, ${city}`,
      pincode,
      lat,
      lng,
      distanceKm: 0,
      status,
      freePorts,
      totalPorts,
      connectors,
      maxPowerKw,
      pricePerKwh,
      hours: "24×7",
      amenities: ["Restrooms", "Café", "Wi-Fi", "Parking"],
      rating,
      reviews,
      googleMapsLink: gmapsLink,
    });
  }

  console.log(`\n✅ Successfully parsed ${stations.length} valid station records!`);

  // Write to src/data/stations.ts
  const fileContent = `export type Station = {
  id: string;
  name: string;
  network: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  lat: number;
  lng: number;
  distanceKm: number;
  status: "available" | "limited" | "busy" | "offline";
  freePorts: number;
  totalPorts: number;
  connectors: string[];
  maxPowerKw: number;
  pricePerKwh: number;
  hours: string;
  amenities: string[];
  rating: number;
  reviews: number;
  googleMapsLink?: string;
};

export const INDIA_CENTER = {
  lat: 20.5937,
  lng: 78.9629,
  zoom: 5,
};

export const cityCoordinates: Record<string, { lat: number; lng: number; zoom: number }> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946, zoom: 12 },
  Mumbai: { lat: 19.076, lng: 72.8777, zoom: 12 },
  "New Delhi": { lat: 28.6139, lng: 77.209, zoom: 12 },
  Gurugram: { lat: 28.4595, lng: 77.0266, zoom: 12 },
  Noida: { lat: 28.5355, lng: 77.391, zoom: 12 },
  Hyderabad: { lat: 17.385, lng: 78.4867, zoom: 12 },
  Chennai: { lat: 13.0827, lng: 80.2707, zoom: 12 },
  Pune: { lat: 18.5204, lng: 73.8567, zoom: 12 },
  Kolkata: { lat: 22.5726, lng: 88.3639, zoom: 12 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714, zoom: 12 },
  Jaipur: { lat: 26.9124, lng: 75.7873, zoom: 12 },
  Kochi: { lat: 9.9312, lng: 76.2673, zoom: 12 },
  Chandigarh: { lat: 30.7333, lng: 76.7794, zoom: 12 },
  Lucknow: { lat: 26.8467, lng: 80.9462, zoom: 12 },
  Surat: { lat: 21.1702, lng: 72.8311, zoom: 12 },
  Indore: { lat: 22.7196, lng: 75.8577, zoom: 12 },
  Coimbatore: { lat: 11.0168, lng: 76.9558, zoom: 12 },
  Goa: { lat: 15.2993, lng: 74.124, zoom: 11 },
  Nagpur: { lat: 21.1458, lng: 79.0882, zoom: 12 },
  Vadodara: { lat: 22.3072, lng: 73.1812, zoom: 12 },
  Bhopal: { lat: 23.2599, lng: 77.4126, zoom: 12 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185, zoom: 12 },
  Patna: { lat: 25.5941, lng: 85.1376, zoom: 12 },
  Agra: { lat: 27.1767, lng: 78.0081, zoom: 12 },
  Varanasi: { lat: 25.3176, lng: 82.9739, zoom: 12 },
  Amritsar: { lat: 31.634, lng: 74.8723, zoom: 12 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245, zoom: 12 },
  Guwahati: { lat: 26.1445, lng: 91.7362, zoom: 12 },
  Dehradun: { lat: 30.3165, lng: 78.0322, zoom: 12 },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366, zoom: 12 },
  Mysore: { lat: 12.2958, lng: 76.6394, zoom: 12 },
  Mangalore: { lat: 12.9141, lng: 74.856, zoom: 12 },
  Ludhiana: { lat: 30.901, lng: 75.8573, zoom: 12 },
  Kanpur: { lat: 26.4499, lng: 80.3319, zoom: 12 },
  Nashik: { lat: 19.9975, lng: 73.7898, zoom: 12 },
  Rajkot: { lat: 22.3039, lng: 70.8022, zoom: 12 },
  Vijayawada: { lat: 16.5062, lng: 80.648, zoom: 12 },
  Madurai: { lat: 9.9252, lng: 78.1198, zoom: 12 },
  Raipur: { lat: 21.2514, lng: 81.6296, zoom: 12 },
  Ranchi: { lat: 23.3441, lng: 85.3096, zoom: 12 },
  Jodhpur: { lat: 26.2389, lng: 73.0243, zoom: 12 },
  Udaipur: { lat: 24.5854, lng: 73.7125, zoom: 12 },
};

export const TOP_CITIES = [
  "Bengaluru",
  "Mumbai",
  "New Delhi",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Chandigarh",
  "Goa",
];

export const cities = TOP_CITIES.map((name) => ({ name }));

export const MAJOR_CITIES = Object.keys(cityCoordinates).sort();

export const statusMeta: Record<
  Station["status"],
  { label: string; tone: "accent" | "warn" | "frost" | "destructive"; desc: string }
> = {
  available: {
    label: "Available Now",
    tone: "accent",
    desc: "Ports ready for immediate charging",
  },
  limited: {
    label: "Limited Ports",
    tone: "warn",
    desc: "1 port remaining, expect wait times",
  },
  busy: {
    label: "In Use / Busy",
    tone: "destructive",
    desc: "All ports currently occupied",
  },
  offline: {
    label: "Offline / Maintenance",
    tone: "frost",
    desc: "Station temporarily unavailable",
  },
};

export const stations: Station[] = ${JSON.stringify(stations, null, 2)};
`;

  fs.writeFileSync(path.resolve("src/data/stations.ts"), fileContent, "utf-8");
  console.log("✅ Updated src/data/stations.ts with all records!");
}

exportFromMysql().catch(console.error);
