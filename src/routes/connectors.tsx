import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { SiteChrome } from "../components/SiteChrome";

export const Route = createFileRoute("/connectors")({
  head: () => ({
    meta: [
      { title: "EV Connector & Plug Guide India | EvFinder" },
      {
        name: "description",
        content:
          "Complete visual guide to all EV charging connector types in India: CCS2, Type 2 AC, GB/T Bharat DC-001, LECCS, CHAdeMO, and 15A wall plugs with vehicle compatibility and specs.",
      },
      { property: "og:title", content: "EV Connector & Plug Guide for India | EvFinder" },
      {
        property: "og:description",
        content:
          "Detailed guide on EV charging port standards in India with real images, pin configurations, speeds, and compatible cars, scooters, and fleets.",
      },
    ],
  }),
  component: ConnectorGuidePage,
});

export interface ConnectorInfo {
  id: string;
  name: string;
  codeName: string;
  category: "dc_fast" | "ac_normal" | "light_ev" | "standard_socket";
  currentType: "DC (Direct Current)" | "AC (Alternating Current)" | "AC / DC Combined";
  image: string;
  maxPowerKw: number;
  typicalChargeTime: string;
  voltageRange: string;
  maxCurrent: string;
  standardNorm: string;
  popularityInIndia: "Dominant Standard (90%+)" | "Common Standard" | "Growing Standard" | "Niche / Legacy" | "Universal";
  summary: string;
  pinDescription: string;
  compatibleVehicles: string[];
  pros: string[];
  cons: string[];
  filterQuery: string;
}

export const CONNECTORS_DATA: ConnectorInfo[] = [
  {
    id: "ccs2",
    name: "CCS Type 2 (Combined Charging System)",
    codeName: "CCS2 / Combo 2",
    category: "dc_fast",
    currentType: "DC (Direct Current)",
    image: "/images/connectors/ccs2.jpg",
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
    image: "/images/connectors/type2.jpg",
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
    image: "/images/connectors/gbt.jpg",
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
    image: "/images/connectors/leccs.jpg",
    maxPowerKw: 15,
    typicalChargeTime: "25 – 45 mins (0% to 80% on 2W battery)",
    voltageRange: "48V – 120V DC / 230V AC",
    maxCurrent: "Up to 100A DC / 16A AC",
    standardNorm: "BIS Standard IS 17017 (Part 2 / Sec 7)",
    popularityInIndia: "Growing Standard",
    summary:
      "India's groundbreaking indigenous standard recognized by the Bureau of Indian Standards (BIS) for 2-wheelers and 3-wheelers. Pioneered by Ather Energy and interoperable across Hero Vida and other leading 2W OEMs.",
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
    filterQuery: "Ather",
  },
  {
    id: "chademo",
    name: "CHAdeMO Fast Connector",
    codeName: "CHAdeMO 1.2 / 2.0 (JEVS G105)",
    category: "dc_fast",
    currentType: "DC (Direct Current)",
    image: "/images/connectors/chademo.jpg",
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
    image: "/images/connectors/socket15a.jpg",
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
    filterQuery: "15A",
  },
];

export function ConnectorGuidePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeModalConnector, setActiveModalConnector] = useState<ConnectorInfo | null>(null);

  const filteredConnectors = useMemo(() => {
    return CONNECTORS_DATA.filter((c) => {
      if (selectedCategory !== "all" && c.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.codeName.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.compatibleVehicles.some((v) => v.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <SiteChrome>
      {/* Hero Header */}
      <section className="px-6 sm:px-8 lg:px-14 pt-8 pb-6">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/30 px-3.5 py-1 text-xs font-bold text-accent mb-3 shadow-sm">
            <span>⚡ Complete EV Hardware Specs</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
            EV Connector & Plug Guide <span className="text-charge-gradient">India</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-frost/70 leading-relaxed max-w-2xl">
            Understand every electric vehicle charging port standard across 2-wheelers, 4-wheelers, and commercial fleets in India — with pinout diagrams, real pictures, power ratings, and vehicle compatibility.
          </p>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All Connectors (6)" },
              { id: "dc_fast", label: "⚡ DC Fast Chargers" },
              { id: "ac_normal", label: "🔌 AC Wallbox & Dest" },
              { id: "light_ev", label: "🛵 2W / 3W (LECCS)" },
              { id: "standard_socket", label: "🏠 15A Home Socket" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  selectedCategory === tab.id
                    ? "bg-accent text-accent-foreground border border-accent shadow-md shadow-accent/20"
                    : "border border-border/80 bg-ink2/50 text-frost/70 hover:text-foreground hover:bg-ink2"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] max-w-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by car, scooter, or plug..."
              className="w-full rounded-full border border-border bg-ink2/70 px-4 py-2 pl-9 text-xs font-semibold text-foreground placeholder:text-frost/50 focus:border-accent focus:outline-none backdrop-blur-md"
            />
            <span className="absolute left-3 top-2.5 text-xs text-frost/50">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2 text-xs text-frost/60 hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Grid of Connectors */}
      <section className="px-6 sm:px-8 lg:px-14 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredConnectors.map((c) => (
            <div
              key={c.id}
              className="group relative flex flex-col rounded-3xl glass-panel p-6 border border-border/80 shadow-xl hover:border-accent/50 hover:shadow-2xl hover:shadow-accent/10 transition-all duration-300"
            >
              {/* Image Container with Glow */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/40 border border-border/60 mb-5 group-hover:scale-[1.02] transition-transform duration-300">
                <img
                  src={c.image}
                  alt={c.name}
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
                {/* Top Badge Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-md ${
                      c.category === "dc_fast"
                        ? "bg-accent/90 text-accent-foreground border border-accent/40"
                        : c.category === "ac_normal"
                        ? "bg-emerald-500/90 text-white border border-emerald-400/40"
                        : c.category === "light_ev"
                        ? "bg-amber-500/90 text-white border border-amber-400/40"
                        : "bg-blue-500/90 text-white border border-blue-400/40"
                    }`}
                  >
                    {c.category === "dc_fast"
                      ? "DC Ultra Fast"
                      : c.category === "ac_normal"
                      ? "AC Standard"
                      : c.category === "light_ev"
                      ? "Light EV (2W/3W)"
                      : "Universal Socket"}
                  </span>
                </div>

                <div className="absolute bottom-3 right-3 rounded-xl bg-background/85 px-3 py-1 text-xs font-black backdrop-blur-md border border-border text-accent">
                  ⚡ Up to {c.maxPowerKw} kW
                </div>
              </div>

              {/* Title and Code */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-foreground group-hover:text-accent transition">
                    {c.name}
                  </h2>
                  <p className="text-xs font-semibold text-frost/60 mt-0.5">{c.codeName}</p>
                </div>
              </div>

              {/* Summary Description */}
              <p className="mt-3 text-xs text-frost/80 leading-relaxed line-clamp-3">
                {c.summary}
              </p>

              {/* Key Specs Matrix */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-ink2/60 p-3 text-[11px] border border-border/50">
                <div>
                  <span className="text-frost/50 block text-[10px] uppercase font-bold">Speed Rating</span>
                  <span className="font-bold text-foreground">{c.typicalChargeTime}</span>
                </div>
                <div>
                  <span className="text-frost/50 block text-[10px] uppercase font-bold">Voltage Range</span>
                  <span className="font-bold text-foreground">{c.voltageRange}</span>
                </div>
                <div>
                  <span className="text-frost/50 block text-[10px] uppercase font-bold">Max Current</span>
                  <span className="font-bold text-foreground">{c.maxCurrent}</span>
                </div>
                <div>
                  <span className="text-frost/50 block text-[10px] uppercase font-bold">India Adoption</span>
                  <span className="font-bold text-accent">{c.popularityInIndia}</span>
                </div>
              </div>

              {/* Compatible Vehicles Snippet */}
              <div className="mt-4 flex-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-frost/60 block mb-1.5">
                  Top Compatible Vehicles:
                </span>
                <ul className="space-y-1 text-xs text-frost/90">
                  {c.compatibleVehicles.slice(0, 3).map((veh, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 truncate">
                      <span className="text-accent text-[10px]">✔</span>
                      <span className="truncate">{veh}</span>
                    </li>
                  ))}
                  {c.compatibleVehicles.length > 3 && (
                    <li className="text-[11px] text-accent/80 font-bold">
                      + {c.compatibleVehicles.length - 3} more models
                    </li>
                  )}
                </ul>
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-3">
                <button
                  onClick={() => setActiveModalConnector(c)}
                  className="flex-1 rounded-xl bg-ink2 hover:bg-ink2/90 border border-border hover:border-accent/40 py-2.5 text-xs font-bold text-foreground transition text-center shadow-sm"
                >
                  Full Specs & Pinout 🔍
                </button>
                <Link
                  to="/stations"
                  search={{ connector: c.filterQuery }}
                  className="flex-1 rounded-xl charge-button py-2.5 text-xs font-extrabold text-center transition shadow-md shadow-accent/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Find Stations →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Comparison Table Section */}
        <div className="mt-16 rounded-3xl glass-panel p-6 sm:p-8 border border-border/80 shadow-2xl">
          <div className="max-w-2xl mb-6">
            <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              EV Connector Comparison Matrix
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-frost/70">
              Quick reference for Indian EV owners, commercial fleet drivers, and charging station installers.
            </p>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-ink2/50 text-frost/60 text-[11px] uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Connector Type</th>
                  <th className="py-3 px-4">Power Type</th>
                  <th className="py-3 px-4">Max Output</th>
                  <th className="py-3 px-4">Charge Time (20-80%)</th>
                  <th className="py-3 px-4">Primary Vehicle Segments</th>
                  <th className="py-3 px-4">Find Live</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {CONNECTORS_DATA.map((c) => (
                  <tr key={c.id} className="hover:bg-ink2/30 transition">
                    <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-3">
                      <img
                        src={c.image}
                        alt={c.name}
                        className="size-9 rounded-lg object-cover border border-border/80 shadow-sm"
                      />
                      <div>
                        <div className="text-foreground">{c.name}</div>
                        <div className="text-[10px] text-frost/50 font-normal">{c.codeName}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-ink2 px-2.5 py-1 text-[10px] font-bold text-frost">
                        {c.currentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-accent">{c.maxPowerKw} kW</td>
                    <td className="py-3.5 px-4 text-frost/80">{c.typicalChargeTime}</td>
                    <td className="py-3.5 px-4 text-frost/80 max-w-xs truncate">{c.compatibleVehicles[0]}</td>
                    <td className="py-3.5 px-4">
                      <Link
                        to="/stations"
                        search={{ connector: c.filterQuery }}
                        className="text-accent font-bold hover:underline"
                      >
                        Search Stations →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* EV Charging FAQ Section */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-3xl glass-panel p-6 border border-border/70">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-accent">❓</span> Which connector does my EV use?
            </h3>
            <p className="mt-2 text-xs text-frost/70 leading-relaxed">
              Nearly all 4-wheeler EVs sold in India since 2021 (Tata Nexon/Punch/Curvv, Mahindra XUV400, MG ZS EV/Windsor, Hyundai, BYD) use the <strong>CCS2</strong> standard for DC fast charging and <strong>Type 2</strong> for home/destination AC charging. Electric 2-wheelers use either the BIS <strong>LECCS</strong> standard (Ather, Vida) or standard <strong>15A home sockets</strong> (Ola, TVS, Chetak).
            </p>
          </div>

          <div className="rounded-3xl glass-panel p-6 border border-border/70">
            <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
              <span className="text-accent">⚡</span> What is the difference between AC and DC charging?
            </h3>
            <p className="mt-2 text-xs text-frost/70 leading-relaxed">
              <strong>AC Charging</strong> supplies alternating current to the vehicle's onboard charger (OBC), which converts it to DC to fill the battery (ideal for gentle overnight charging). <strong>DC Fast Charging</strong> bypasses the vehicle's onboard converter and pumps direct current straight into the high-voltage battery at up to 350 kW speeds.
            </p>
          </div>
        </div>
      </section>

      {/* Full Specs Modal */}
      {activeModalConnector && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-md overflow-y-auto"
          onClick={() => setActiveModalConnector(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl glass-panel p-6 sm:p-8 border border-border shadow-2xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => setActiveModalConnector(null)}
              className="absolute top-5 right-5 grid size-9 place-items-center rounded-full bg-ink2 hover:bg-ink2/80 text-frost/70 hover:text-foreground border border-border transition"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <img
                src={activeModalConnector.image}
                alt={activeModalConnector.name}
                className="w-full sm:w-48 aspect-[4/3] rounded-2xl object-cover border border-border shadow-md"
              />
              <div className="flex-1">
                <span className="rounded-full bg-accent/20 border border-accent/40 px-3 py-1 text-[10px] font-black uppercase text-accent">
                  {activeModalConnector.category.replace("_", " ").toUpperCase()}
                </span>
                <h3 className="font-display text-2xl font-black text-foreground mt-2">
                  {activeModalConnector.name}
                </h3>
                <p className="text-xs text-frost/60 font-semibold">{activeModalConnector.codeName}</p>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <span className="font-bold text-accent">⚡ Max {activeModalConnector.maxPowerKw} kW</span>
                  <span className="text-frost/40">|</span>
                  <span className="text-frost/80">{activeModalConnector.typicalChargeTime}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6 space-y-4 text-xs text-frost/80 leading-relaxed border-t border-border/60 pt-4">
              <div>
                <h4 className="font-bold uppercase tracking-wider text-foreground text-[11px] mb-1">
                  Overview & Engineering Standard
                </h4>
                <p>{activeModalConnector.summary}</p>
              </div>

              <div>
                <h4 className="font-bold uppercase tracking-wider text-foreground text-[11px] mb-1">
                  Pin Configuration & Contact Layout
                </h4>
                <p className="bg-ink2/60 p-3 rounded-xl border border-border/40 font-mono text-[11px]">
                  {activeModalConnector.pinDescription}
                </p>
              </div>

              <div>
                <h4 className="font-bold uppercase tracking-wider text-foreground text-[11px] mb-1">
                  Compatible Vehicle Lineup in India
                </h4>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {activeModalConnector.compatibleVehicles.map((veh, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-ink2 border border-border/80 px-2.5 py-1 text-[11px] text-foreground font-medium"
                    >
                      🚗 {veh}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3.5">
                  <span className="text-emerald-400 font-bold text-xs block mb-1.5">Key Advantages</span>
                  <ul className="space-y-1 text-[11px] text-frost/90">
                    {activeModalConnector.pros.map((p, idx) => (
                      <li key={idx}>+ {p}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5">
                  <span className="text-amber-400 font-bold text-xs block mb-1.5">Limitations / Tradeoffs</span>
                  <ul className="space-y-1 text-[11px] text-frost/90">
                    {activeModalConnector.cons.map((c, idx) => (
                      <li key={idx}>- {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action */}
            <div className="mt-6 pt-4 border-t border-border/60 flex justify-end gap-3">
              <button
                onClick={() => setActiveModalConnector(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-frost hover:text-foreground"
              >
                Close
              </button>
              <Link
                to="/stations"
                search={{ connector: activeModalConnector.filterQuery }}
                className="rounded-xl charge-button px-5 py-2 text-xs font-bold shadow-md shadow-accent/20"
              >
                Search {activeModalConnector.name} Stations →
              </Link>
            </div>
          </div>
        </div>
      )}
    </SiteChrome>
  );
}
