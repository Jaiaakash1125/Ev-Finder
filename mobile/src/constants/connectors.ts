import type { ImageSourcePropType } from "react-native";

export type ConnectorCategory = "dc_fast" | "ac_normal" | "light_ev" | "standard_socket";

export interface ConnectorInfo {
  id: string;
  name: string;
  codeName: string;
  category: ConnectorCategory;
  currentType: "DC (Direct Current)" | "AC (Alternating Current)" | "AC / DC Combined";
  image: ImageSourcePropType;
  maxPowerKw: number;
  typicalChargeTime: string;
  voltageRange: string;
  maxCurrent: string;
  standardNorm: string;
  popularityInIndia:
    | "Dominant Standard (90%+)"
    | "Common Standard"
    | "Growing Standard"
    | "Niche / Legacy"
    | "Universal";
  summary: string;
  pinDescription: string;
  compatibleVehicles: string[];
  pros: string[];
  cons: string[];
  filterQuery: string;
}

export const CONNECTOR_CATEGORIES: { id: "all" | ConnectorCategory; label: string }[] = [
  { id: "all", label: "All (6)" },
  { id: "dc_fast", label: "DC Fast" },
  { id: "ac_normal", label: "AC Wallbox" },
  { id: "light_ev", label: "2W / 3W (LECCS)" },
  { id: "standard_socket", label: "15A Socket" },
];

export const CONNECTORS_DATA: ConnectorInfo[] = [
  {
    id: "ccs2",
    name: "CCS Type 2 (Combined Charging System)",
    codeName: "CCS2 / Combo 2",
    category: "dc_fast",
    currentType: "DC (Direct Current)",
    image: require("../../assets/connectors/ccs2.jpg"),
    maxPowerKw: 350,
    typicalChargeTime: "18 – 45 mins (10% to 80%)",
    voltageRange: "200V – 1000V DC",
    maxCurrent: "Up to 500A (Liquid-Cooled)",
    standardNorm: "IEC 62196-3 / ISO 15118",
    popularityInIndia: "Dominant Standard (90%+)",
    summary:
      "The official and most widespread DC Fast Charging standard in India for 4-wheelers and heavy commercial EVs. Combines the Type 2 AC socket with two dedicated high-power DC pins below.",
    pinDescription:
      "7-pin upper section (Type 2 interface for AC charging and communication) + 2 large heavy-duty copper pins at the bottom (DC+ and DC-) for ultra-fast DC flow.",
    compatibleVehicles: [
      "Tata Nexon EV, Punch EV, Curvv EV, Harrier EV",
      "Mahindra XUV400, BE.05, XEV 9e",
      "MG ZS EV, Windsor EV, Cyberster",
      "Hyundai Ioniq 5, Kona EV, Creta EV",
      "Kia EV6, EV9",
      "BYD Atto 3, Seal, Sealion 7, e6",
      "BMW i4, iX1, iX, i7 / Mercedes EQE, EQS, EQB / Audi e-tron",
    ],
    pros: [
      "Supported at over 92% of public DC fast chargers across India",
      "Delivers rapid 50 kW to 350 kW charging speeds",
      "Backwards-compatible: vehicle inlet accepts Type 2 AC home plugs too",
      "Digital handshake protocol prevents overcharging & overheating",
    ],
    cons: [
      "Heavy charging cable due to thick copper gauge & liquid cooling",
      "Not applicable for 2-wheelers or micro-mobility",
    ],
    filterQuery: "CCS2",
  },
  {
    id: "type2",
    name: "Type 2 AC (Mennekes)",
    codeName: "IEC 62196-2 / Mennekes",
    category: "ac_normal",
    currentType: "AC (Alternating Current)",
    image: require("../../assets/connectors/type2.jpg"),
    maxPowerKw: 22,
    typicalChargeTime: "3 – 7 hours (0% to 100%)",
    voltageRange: "230V Single-Phase / 415V Three-Phase AC",
    maxCurrent: "16A – 32A",
    standardNorm: "IEC 62196-2",
    popularityInIndia: "Dominant Standard (90%+)",
    summary:
      "The standard AC charging connector used across India and Europe for home wallbox chargers, workplace parking bays, hotel overnight hubs, and destination AC chargers.",
    pinDescription:
      "Circular 7-pin arrangement featuring 3 Phase AC power lines (L1, L2, L3), Neutral (N), Protective Earth (PE), Control Pilot (CP), and Proximity Pilot (PP).",
    compatibleVehicles: [
      "All 4-wheeler EVs in India (Tata Tiago EV, Tigor EV, Punch EV, Nexon EV)",
      "MG Comet EV, ZS EV, Windsor EV",
      "Mahindra XUV400",
      "Hyundai, Kia, BYD, BMW, Mercedes-Benz, Volvo",
      "Commercial AC destination charge points",
    ],
    pros: [
      "Ideal for gentle, long-term overnight and workplace charging",
      "Significantly reduces battery degradation compared to repeated DC rapid charging",
      "Universal fit for all 4W EV passenger cars sold in India",
      "Lightweight, flexible cables that are easy to plug and carry",
    ],
    cons: [
      "Slow for highway travel stops (typically 3.3 kW, 7.2 kW, or 11 kW onboard limit)",
      "Requires EV's onboard AC-to-DC converter to dictate charge speed",
    ],
    filterQuery: "Type 2",
  },
  {
    id: "gbt",
    name: "GB/T / Bharat DC-001",
    codeName: "GB/T 20234.3 / AIS 138-2",
    category: "dc_fast",
    currentType: "DC (Direct Current)",
    image: require("../../assets/connectors/gbt.jpg"),
    maxPowerKw: 60,
    typicalChargeTime: "45 – 75 mins (15 kW – 50 kW)",
    voltageRange: "48V – 750V DC (Commonly 72V/100V low-voltage fleet DC)",
    maxCurrent: "Up to 200A",
    standardNorm: "GB/T 20234.3 / Bharat DC-001 Spec",
    popularityInIndia: "Common Standard",
    summary:
      "Widely deployed under India's early FAME-I initiative and widely utilized for commercial fleet operations (BluSmart, Uber Green, EV cabs) and older generation Indian electric sedans.",
    pinDescription:
      "9-pin layout with two primary DC power pins (DC+, DC-), ground (PE), auxiliary charging power supply (A+, A-), and CAN-bus communication channels (S+, S-).",
    compatibleVehicles: [
      "Tata Tigor EV (Commercial / Fleet Express-T Edition)",
      "Mahindra e-Verito, e2o Plus",
      "Commercial electric logistics vans & intracity delivery vehicles",
      "BluSmart dedicated fleet fast charging hubs",
    ],
    pros: [
      "High reliability for low-voltage (72V – 100V) battery architectures",
      "Extensive presence in metro commercial fleet depots",
      "Affordable station hardware installation costs",
    ],
    cons: [
      "Phased out in newer private passenger vehicles in favor of CCS2",
      "Incompatible with standard private CCS2 cars without expensive adapters",
    ],
    filterQuery: "GB/T",
  },
  {
    id: "leccs",
    name: "LECCS (Light Electric Vehicle CCS)",
    codeName: "IS 17017 (Part 2 / Sec 7) / Ather Grid",
    category: "light_ev",
    currentType: "AC / DC Combined",
    image: require("../../assets/connectors/leccs.jpg"),
    maxPowerKw: 15,
    typicalChargeTime: "25 – 45 mins (0% to 80% on 2W battery)",
    voltageRange: "48V – 120V DC / 230V AC",
    maxCurrent: "Up to 100A DC / 16A AC",
    standardNorm: "BIS Standard IS 17017 (Part 2 / Sec 7)",
    popularityInIndia: "Growing Standard",
    summary:
      "India's indigenous standard recognized by the Bureau of Indian Standards (BIS) for 2-wheelers and 3-wheelers. Pioneered by Ather Energy and interoperable across Hero Vida and other leading 2W OEMs.",
    pinDescription:
      "Ultra-compact ergonomic plug integrating both AC slow charging and DC fast charging in a single lightweight handle designed specifically for scooters and motorbikes.",
    compatibleVehicles: [
      "Ather 450X, 450S, 450 Apex, Ather Rizta",
      "Hero Vida V1 Pro / V1 Plus",
      "Upcoming Light 2W & 3W EVs adopting BIS standard",
      "Ather Grid public fast charging network (2,500+ points across India)",
    ],
    pros: [
      "First standardized combined AC/DC charging interface tailored for 2W EVs",
      "Extremely compact and lightweight for easy single-hand operation",
      "Provides up to 1.5 km/min fast charging speed on electric scooters",
      "Interoperable open standard supported by major Indian 2W manufacturers",
    ],
    cons: [
      "Exclusively designed for 2-wheelers & 3-wheelers; cannot charge 4W cars",
      "Legacy 2W models (Ola S1, TVS iQube) still utilize proprietary or 15A plugs",
    ],
    filterQuery: "LECCS",
  },
  {
    id: "chademo",
    name: "CHAdeMO Fast Connector",
    codeName: "CHAdeMO 1.2 / 2.0 (JEVS G105)",
    category: "dc_fast",
    currentType: "DC (Direct Current)",
    image: require("../../assets/connectors/chademo.jpg"),
    maxPowerKw: 62.5,
    typicalChargeTime: "30 – 50 mins (10% to 80%)",
    voltageRange: "200V – 500V DC",
    maxCurrent: "Up to 125A",
    standardNorm: "IEC 62196-3 / CHAdeMO Protocol",
    popularityInIndia: "Niche / Legacy",
    summary:
      "The Japanese DC fast charging standard developed by Tokyo Electric Power Company. Found on tri-standard multi-gun public chargers alongside CCS2 and Type 2 across highways in India.",
    pinDescription:
      "Large circular heavy-duty face with 2 large DC power terminals (DC+, DC-) and multiple control, ground, CAN bus lines with physical locking latches.",
    compatibleVehicles: [
      "Nissan Leaf (Private imports / R&D units)",
      "Mitsubishi Outlander PHEV",
      "Older Japanese electric vehicle imports",
      "Multi-standard highway EV charging plazas (Zeon, Tata Power, Statiq)",
    ],
    pros: [
      "Supports bidirectional charging (V2G / Vehicle-to-Grid) natively",
      "Very robust locking mechanism with zero accidental disconnections",
      "Still present on many multi-port highway DC chargers",
    ],
    cons: [
      "Almost no new passenger EV models sold in India use CHAdeMO today",
      "Bulkier connector head compared to modern CCS2",
    ],
    filterQuery: "CHAdeMO",
  },
  {
    id: "socket15a",
    name: "15A 3-Pin Wall Socket (Indian Standard)",
    codeName: "IS 1293 (Type M / Type D Socket)",
    category: "standard_socket",
    currentType: "AC (Alternating Current)",
    image: require("../../assets/connectors/socket15a.jpg"),
    maxPowerKw: 3.3,
    typicalChargeTime: "5 – 12 hours (Portable EVSE)",
    voltageRange: "230V Single-Phase AC, 50Hz",
    maxCurrent: "15 Amperes Continuous (16A Surge)",
    standardNorm: "Bureau of Indian Standards IS:1293",
    popularityInIndia: "Universal",
    summary:
      "The universal heavy-duty 3-pin round wall socket found in every Indian home, office, parking lot, dhaba, and roadside hotel. Serves as the primary charging method for 2-wheelers and emergency lifeline for 4-wheelers.",
    pinDescription:
      "3 large round brass pins: Top pin is oversized Protective Earth (PE), bottom-left is Live (Phase), and bottom-right is Neutral.",
    compatibleVehicles: [
      "All Indian electric two-wheelers (Ola S1, TVS iQube, Bajaj Chetak, Hero Electric, Revolt)",
      "Electric 3-Wheelers & E-Rickshaws",
      "Portable emergency trickle chargers included with all 4W EVs (Nexon EV, XUV400, MG, Hyundai, etc.)",
      "Bharat AC-001 3-socket public municipal charging stations",
    ],
    pros: [
      "Available virtually everywhere in India — homes, roadside dhabas, garages, hotels",
      "Requires zero specialized charging infrastructure or high-cost setup",
      "Lowest equipment cost for two-wheeler owners",
    ],
    cons: [
      "Slowest charging method (typically delivers 2.5 kW to 3.3 kW)",
      "Requires verified, dedicated copper earthing to avoid EVSE grounding error faults",
    ],
    filterQuery: "Bharat AC-001",
  },
];
