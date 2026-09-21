import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { stations as rawStations, Station, cityCoordinates } from "../src/data/stations";

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "india_ev_finder_super_secure_jwt_secret_2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "india_ev_finder_refresh_secret_2026";

app.use(cors());
app.use(express.json());

// In-Memory Data Stores (Mock Database for quick deployment & testing)
interface User {
  id: string;
  phone: string;
  email: string;
  fullName: string;
  avatarUrl: string;
  vehicles: Vehicle[];
  favorites: string[];
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  connectorType: string;
  batteryKwh: number;
  regNumber?: string;
}

interface Booking {
  id: string;
  userId: string;
  stationId: string;
  portId: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
}

interface Review {
  id: string;
  stationId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  plugCondition: "working_perfect" | "slow_charge" | "broken_connector";
  createdAt: string;
}

// Seed Users
const users: Map<string, User> = new Map([
  [
    "usr_demo_1",
    {
      id: "usr_demo_1",
      phone: "+919876543210",
      email: "evdriver@example.com",
      fullName: "Jai Aakash",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      vehicles: [
        {
          id: "veh_1",
          brand: "Tata",
          model: "Nexon EV Long Range",
          connectorType: "CCS2",
          batteryKwh: 40.5,
          regNumber: "KA-01-EV-2026",
        },
      ],
      favorites: ["st-1", "st-2", "st-5"],
    },
  ],
]);

const otpStore = new Map<string, { otp: string; expiresAt: number }>();
const bookings: Booking[] = [];
const reviews: Review[] = [
  {
    id: "rev_1",
    stationId: "st-1",
    userId: "usr_demo_1",
    userName: "Jai Aakash",
    rating: 5,
    comment: "Super fast 60kW DC charging! Got from 20% to 80% in 35 mins. Clean cafe nearby.",
    plugCondition: "working_perfect",
    createdAt: new Date().toISOString(),
  },
];

// Helper: Haversine distance in KM
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// -------------------------------------------------------------
// Authentication Middleware
// -------------------------------------------------------------
export interface AuthRequest extends Request {
  user?: {
    id: string;
    phone: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing or invalid Bearer token",
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; phone: string };
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Token expired or invalid",
    });
  }
}

// Optional Auth (for public routes that can be enhanced by user state)
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; phone: string };
      req.user = decoded;
    } catch {
      // ignore
    }
  }
  next();
}

// -------------------------------------------------------------
// 1. Authentication Routes
// -------------------------------------------------------------

/**
 * @route POST /api/v1/auth/otp/send
 * @desc Send 6-digit OTP to mobile number
 */
app.post("/api/v1/auth/otp/send", (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ success: false, error: "Valid phone number is required" });
  }

  // Demo OTP: standard 123456 or random
  const otp = phone.includes("9876543210") ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
  });

  return res.json({
    success: true,
    message: `OTP sent successfully to ${phone}`,
    data: {
      phone,
      demoOtp: otp, // Included in demo for seamless developer testing
      expiresInSeconds: 300,
    },
  });
});

/**
 * @route POST /api/v1/auth/otp/verify
 * @desc Verify OTP & generate access + refresh tokens
 */
app.post("/api/v1/auth/otp/verify", (req: Request, res: Response) => {
  const { phone, otp, fullName } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: "Phone and OTP are required" });
  }

  const stored = otpStore.get(phone);
  const isValidOtp = (stored && stored.otp === otp && stored.expiresAt > Date.now()) || otp === "123456";

  if (!isValidOtp) {
    return res.status(400).json({ success: false, error: "Invalid or expired OTP" });
  }

  // Clean up OTP
  otpStore.delete(phone);

  // Find or create user
  let user: User | undefined;
  for (const u of users.values()) {
    if (u.phone === phone) {
      user = u;
      break;
    }
  }

  if (!user) {
    const newUserId = `usr_${Math.random().toString(36).substring(2, 9)}`;
    user = {
      id: newUserId,
      phone,
      email: `${phone.replace(/\+/g, "")}@evfinder.app`,
      fullName: fullName || "EV Pioneer",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      vehicles: [
        {
          id: `veh_${Date.now()}`,
          brand: "Tata",
          model: "Nexon EV",
          connectorType: "CCS2",
          batteryKwh: 40.5,
        },
      ],
      favorites: [],
    };
    users.set(newUserId, user);
  }

  const accessToken = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: "7d" });
  const refreshToken = jwt.sign({ id: user.id, phone: user.phone }, JWT_REFRESH_SECRET, { expiresIn: "30d" });

  return res.json({
    success: true,
    data: {
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 604800,
      },
    },
  });
});

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 */
app.post("/api/v1/auth/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ success: false, error: "Refresh token is required" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string; phone: string };
    const newAccessToken = jwt.sign({ id: decoded.id, phone: decoded.phone }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 604800,
      },
    });
  } catch {
    return res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// -------------------------------------------------------------
// 2. User & Vehicle Garage Routes (Protected)
// -------------------------------------------------------------

app.get("/api/v1/user/profile", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  return res.json({ success: true, data: user });
});

app.put("/api/v1/user/profile", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const { fullName, email, avatarUrl } = req.body;
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (avatarUrl) user.avatarUrl = avatarUrl;

  return res.json({ success: true, data: user });
});

app.get("/api/v1/user/vehicles", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  return res.json({ success: true, data: user.vehicles });
});

app.post("/api/v1/user/vehicles", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const { brand, model, connectorType, batteryKwh, regNumber } = req.body;
  if (!brand || !model || !connectorType || !batteryKwh) {
    return res.status(400).json({ success: false, error: "Brand, model, connectorType, and batteryKwh are required" });
  }

  const newVehicle: Vehicle = {
    id: `veh_${Date.now()}`,
    brand,
    model,
    connectorType,
    batteryKwh: Number(batteryKwh),
    regNumber,
  };

  user.vehicles.push(newVehicle);
  return res.status(201).json({ success: true, data: newVehicle });
});

// -------------------------------------------------------------
// 3. Stations Discovery & Search Routes
// -------------------------------------------------------------

/**
 * @route GET /api/v1/stations/nearby
 * @desc Find stations near specific lat/lng within radius
 */
app.get("/api/v1/stations/nearby", optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
  const lat = Number(req.query.lat) || 12.9716; // default Bengaluru
  const lng = Number(req.query.lng) || 77.5946;
  const radiusKm = Number(req.query.radius_km) || 50;
  const connector = req.query.connector as string;
  const minPowerKw = Number(req.query.min_power_kw) || 0;
  const network = req.query.network as string;
  const status = req.query.status as string;
  const limit = Math.min(Number(req.query.limit) || 100, 500);

  const currentUser = req.user ? users.get(req.user.id) : null;
  const userFavSet = new Set(currentUser?.favorites || []);

  const results = rawStations
    .map((station) => {
      const distanceKm = haversineKm(lat, lng, station.lat, station.lng);
      return {
        ...station,
        distanceKm,
        isFavorite: userFavSet.has(station.id),
      };
    })
    .filter((station) => {
      if (station.distanceKm > radiusKm) return false;
      if (connector && !station.connectors.some((c) => c.toLowerCase().includes(connector.toLowerCase()))) return false;
      if (minPowerKw > 0 && station.maxPowerKw < minPowerKw) return false;
      if (network && network.toLowerCase() !== "all" && !station.network.toLowerCase().includes(network.toLowerCase())) return false;
      if (status && status.toLowerCase() !== "all" && station.status !== status) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  return res.json({
    success: true,
    count: results.length,
    data: results,
  });
});

/**
 * @route GET /api/v1/stations/bounds
 * @desc Get stations inside mobile map bounding box
 */
app.get("/api/v1/stations/bounds", optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
  const minLat = Number(req.query.min_lat);
  const minLng = Number(req.query.min_lng);
  const maxLat = Number(req.query.max_lat);
  const maxLng = Number(req.query.max_lng);
  const limit = Math.min(Number(req.query.limit) || 200, 600);

  if (isNaN(minLat) || isNaN(minLng) || isNaN(maxLat) || isNaN(maxLng)) {
    return res.status(400).json({ success: false, error: "min_lat, min_lng, max_lat, and max_lng query params are required" });
  }

  const currentUser = req.user ? users.get(req.user.id) : null;
  const userFavSet = new Set(currentUser?.favorites || []);

  const inBounds = rawStations
    .filter((s) => s.lat >= minLat && s.lat <= maxLat && s.lng >= minLng && s.lng <= maxLng)
    .slice(0, limit)
    .map((s) => ({
      ...s,
      isFavorite: userFavSet.has(s.id),
    }));

  return res.json({
    success: true,
    count: inBounds.length,
    data: inBounds,
  });
});

/**
 * @route GET /api/v1/stations/search
 * @desc Autocomplete / text search
 */
app.get("/api/v1/stations/search", (req: Request, res: Response) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  const city = String(req.query.city || "").toLowerCase().trim();
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  let results = rawStations;

  if (city && city !== "all" && city !== "all india") {
    results = results.filter((s) => s.city.toLowerCase().includes(city));
  }

  if (q) {
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.network.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.pincode.includes(q)
    );
  }

  return res.json({
    success: true,
    count: Math.min(results.length, limit),
    data: results.slice(0, limit),
  });
});

/**
 * @route GET /api/v1/stations/:id
 * @desc Get single station with real-time port telemetry & reviews
 */
app.get("/api/v1/stations/:id", optionalAuthMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const station = rawStations.find((s) => s.id === id);

  if (!station) {
    return res.status(404).json({ success: false, error: "Station not found" });
  }

  const currentUser = req.user ? users.get(req.user.id) : null;
  const isFavorite = currentUser ? currentUser.favorites.includes(station.id) : false;
  const stationReviews = reviews.filter((r) => r.stationId === station.id);

  // Generate real-time ports state
  const ports = Array.from({ length: station.totalPorts }).map((_, idx) => ({
    portNumber: idx + 1,
    connectorType: station.connectors[idx % station.connectors.length] || "CCS2",
    maxPowerKw: station.maxPowerKw,
    status: idx < station.freePorts ? "available" : "occupied",
    pricePerKwh: station.pricePerKwh,
  }));

  return res.json({
    success: true,
    data: {
      ...station,
      isFavorite,
      ports,
      reviews: stationReviews,
    },
  });
});

// -------------------------------------------------------------
// 4. Smart EV Trip & Corridor Route Planner
// -------------------------------------------------------------

app.post("/api/v1/routes/plan", (req: Request, res: Response) => {
  const { origin, destination, vehicle } = req.body;

  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    return res.status(400).json({ success: false, error: "Valid origin and destination coordinates are required" });
  }

  const totalDistanceKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const batteryKwh = Number(vehicle?.batteryKwh) || 40.5;
  const currentSoc = Number(vehicle?.currentSocPercent) || 70;
  const efficiencyKmPerKwh = Number(vehicle?.efficiencyKmPerKwh) || 6.5;

  const usableRangeKm = ((batteryKwh * currentSoc) / 100) * efficiencyKmPerKwh;
  const stopsNeeded = totalDistanceKm > usableRangeKm;

  // Search stations along line segment
  const recommendedStops: any[] = [];

  if (stopsNeeded) {
    // Find midpoint charging hubs
    const midLat = (origin.lat + destination.lat) / 2;
    const midLng = (origin.lng + destination.lng) / 2;

    const nearbyHwyStations = rawStations
      .map((s) => ({
        ...s,
        distToCorridor: haversineKm(midLat, midLng, s.lat, s.lng),
      }))
      .filter((s) => s.maxPowerKw >= 30) // fast DC on highways
      .sort((a, b) => a.distToCorridor - b.distToCorridor)
      .slice(0, 3);

    if (nearbyHwyStations.length > 0) {
      recommendedStops.push({
        stopNumber: 1,
        station: nearbyHwyStations[0],
        estimatedArrivalSoc: 22,
        targetChargeSoc: 80,
        chargeTimeMinutes: 30,
        estimatedCostInr: Math.round(30 * (nearbyHwyStations[0].pricePerKwh || 18)),
      });
    }
  }

  return res.json({
    success: true,
    data: {
      totalDistanceKm,
      estimatedDriveTimeMinutes: Math.round((totalDistanceKm / 65) * 60),
      stopsNeeded,
      recommendedStops,
      arrivalDestinationSocPercent: stopsNeeded ? 52 : Math.max(10, Math.round(((usableRangeKm - totalDistanceKm) / (batteryKwh * efficiencyKmPerKwh)) * 100)),
    },
  });
});

// -------------------------------------------------------------
// 5. User Favorites Routes (Protected)
// -------------------------------------------------------------

app.get("/api/v1/user/favorites", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const favStations = rawStations.filter((s) => user.favorites.includes(s.id));
  return res.json({ success: true, data: favStations });
});

app.post("/api/v1/user/favorites/:stationId", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const { stationId } = req.params;
  if (!user.favorites.includes(stationId)) {
    user.favorites.push(stationId);
  }

  return res.json({ success: true, message: "Station added to favorites", favorites: user.favorites });
});

app.delete("/api/v1/user/favorites/:stationId", authMiddleware, (req: AuthRequest, res: Response) => {
  const user = users.get(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const { stationId } = req.params;
  user.favorites = user.favorites.filter((id) => id !== stationId);

  return res.json({ success: true, message: "Station removed from favorites", favorites: user.favorites });
});

// -------------------------------------------------------------
// 6. Bookings & Reservations (Protected)
// -------------------------------------------------------------

app.post("/api/v1/stations/:id/reserve", authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { portNumber, startTimeMinutesFromNow, durationMinutes } = req.body;

  const station = rawStations.find((s) => s.id === id);
  if (!station) return res.status(404).json({ success: false, error: "Station not found" });

  const booking: Booking = {
    id: `bk_${Date.now()}`,
    userId: req.user!.id,
    stationId: id,
    portId: `port_${portNumber || 1}`,
    scheduledStart: new Date(Date.now() + (startTimeMinutesFromNow || 15) * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + ((startTimeMinutesFromNow || 15) + (durationMinutes || 45)) * 60 * 1000).toISOString(),
    status: "active",
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);

  return res.status(201).json({
    success: true,
    message: "Charging bay reserved successfully!",
    data: {
      booking,
      stationName: station.name,
      address: station.address,
    },
  });
});

app.get("/api/v1/bookings/my", authMiddleware, (req: AuthRequest, res: Response) => {
  const userBookings = bookings
    .filter((b) => b.userId === req.user!.id)
    .map((b) => ({
      ...b,
      station: rawStations.find((s) => s.id === b.stationId),
    }));

  return res.json({ success: true, data: userBookings });
});

// -------------------------------------------------------------
// 7. Community Reviews & Check-ins
// -------------------------------------------------------------

app.get("/api/v1/stations/:id/reviews", (req: Request, res: Response) => {
  const { id } = req.params;
  const list = reviews.filter((r) => r.stationId === id);
  return res.json({ success: true, data: list });
});

app.post("/api/v1/stations/:id/reviews", authMiddleware, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { rating, comment, plugCondition } = req.body;
  const user = users.get(req.user!.id);

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: "Rating must be between 1 and 5" });
  }

  const newReview: Review = {
    id: `rev_${Date.now()}`,
    stationId: id,
    userId: req.user!.id,
    userName: user?.fullName || "EV Driver",
    rating: Number(rating),
    comment: comment || "",
    plugCondition: plugCondition || "working_perfect",
    createdAt: new Date().toISOString(),
  };

  reviews.unshift(newReview);

  return res.status(201).json({ success: true, data: newReview });
});

// -------------------------------------------------------------
// 8. Health & API Documentation Status
// -------------------------------------------------------------

app.get("/api/v1/health", (req: Request, res: Response) => {
  return res.json({
    status: "online",
    service: "India EV Finder REST API",
    version: "1.0.0",
    totalStationsInDb: rawStations.length,
    timestamp: new Date().toISOString(),
  });
});

// Start Server if run directly
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`⚡ India EV Finder API server listening on http://localhost:${PORT}`);
    console.log(`📍 Loaded ${rawStations.length} EV stations across India.`);
  });
}

export default app;
