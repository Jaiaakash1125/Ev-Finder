/**
 * India EV Finder – REST API (v1) for the mobile app.
 *
 * Run:   npm run api:dev
 * Test:  npm run api:test
 * Docs:  backend/API.md  ·  backend/openapi.json  ·  GET /api/v1/openapi.json
 *
 * Environment variables
 *   JWT_ACCESS_SECRET    required in production, >= 32 chars (random per-process in dev)
 *   JWT_REFRESH_SECRET   required in production, >= 32 chars, must differ from the access secret
 *   PORT                 default 5000
 *   CORS_ORIGINS         comma separated web origins allowed to call the API (mobile apps send no Origin)
 *   TRUST_PROXY          number of reverse-proxy hops in front of the API (so rate limits see real IPs)
 *   ALLOW_DEMO_OTP       "true" returns the OTP in the /otp/send response (ignored in production)
 *
 * Storage note: users, sessions, bookings and reviews live in process memory, so they reset on restart
 * and cannot be shared by several instances. The stores are small and local to createApp(); swap them
 * for MySQL/Postgres before real users depend on this.
 */
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { z, type ZodTypeAny } from "zod";
import { stations as stationData, type Station } from "../src/data/stations";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface Config {
  isProd: boolean;
  port: number;
  accessSecret: string;
  refreshSecret: string;
  accessTtlSec: number;
  refreshTtlSec: number;
  allowDemoOtp: boolean;
  otpResendCooldownMs: number;
  refreshReuseGraceMs: number;
  corsOrigins: string[];
  trustProxy: number;
  limits: {
    global: { windowMs: number; max: number };
    otpSend: { windowMs: number; max: number };
    otpVerify: { windowMs: number; max: number };
  };
}

function readSecret(env: NodeJS.ProcessEnv, name: string, isProd: boolean): string {
  const value = env[name];
  if (value && value.length >= 32) return value;
  if (isProd) throw new Error(`${name} must be set to a random string of at least 32 characters`);
  console.warn(`[config] ${name} not set – using a throwaway dev secret (tokens die on restart)`);
  return randomBytes(48).toString("hex");
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProd = env["NODE_ENV"] === "production";
  const accessSecret = readSecret(env, "JWT_ACCESS_SECRET", isProd);
  const refreshSecret = readSecret(env, "JWT_REFRESH_SECRET", isProd);
  if (accessSecret === refreshSecret) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different");
  }
  return {
    isProd,
    port: Number(env["PORT"]) || 5000,
    accessSecret,
    refreshSecret,
    accessTtlSec: 15 * 60,
    refreshTtlSec: 30 * 24 * 3600,
    allowDemoOtp: !isProd && env["ALLOW_DEMO_OTP"] === "true",
    otpResendCooldownMs: 30_000,
    refreshReuseGraceMs: 10_000,
    corsOrigins: (env["CORS_ORIGINS"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    trustProxy: Number(env["TRUST_PROXY"]) || 0,
    limits: {
      global: { windowMs: 60_000, max: 600 },
      otpSend: { windowMs: 3_600_000, max: 10 },
      otpVerify: { windowMs: 15 * 60_000, max: 30 },
    },
  };
}

const ISSUER = "evfinder-api";
const AUDIENCE = "evfinder-mobile";
const OTP_TTL_MS = 5 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_HOUR = 5;
const MAX_VEHICLES = 10;
const MAX_ACTIVE_BOOKINGS = 3;

// ---------------------------------------------------------------------------
// Errors, responses, validation
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}

function ok(res: Response, data: unknown, meta?: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value ?? {});
  if (!result.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Request validation failed",
      result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  return result.data;
}

const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optStr = (max = 60) => z.preprocess(blankToUndefined, z.string().trim().max(max).optional());
const optNum = (min: number, max: number) =>
  z.preprocess(blankToUndefined, z.coerce.number().min(min).max(max).optional());

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{9,14}$/, "Phone must be in E.164 format, e.g. +919876543210");

const STATUS_VALUES = ["available", "limited", "busy", "offline"] as const;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  connectorType: string;
  batteryKwh: number;
  regNumber?: string;
}

interface User {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  vehicles: Vehicle[];
  favorites: string[];
  createdAt: string;
}

interface Booking {
  id: string;
  userId: string;
  stationId: string;
  portNumber: number;
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

export interface SmsSender {
  send(phone: string, message: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Geo helpers
// ---------------------------------------------------------------------------

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Position of point p relative to segment a→b: t in [0,1] along it, off = distance from the line in km. */
function projectOnSegment(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  p: { lat: number; lng: number },
) {
  const kmPerDegLat = 111.19;
  const kmPerDegLng = kmPerDegLat * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  const bx = (b.lng - a.lng) * kmPerDegLng;
  const by = (b.lat - a.lat) * kmPerDegLat;
  const px = (p.lng - a.lng) * kmPerDegLng;
  const py = (p.lat - a.lat) * kmPerDegLat;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return { t, off: Math.hypot(px - t * bx, py - t * by) };
}

// ---------------------------------------------------------------------------
// Rate limiting (fixed window, in-memory – use a shared store if you run >1 instance)
// ---------------------------------------------------------------------------

function rateLimit(opts: { windowMs: number; max: number; code?: string }): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
    },
    Math.min(opts.windowMs, 60_000),
  ).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? "unknown";
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    res.setHeader("RateLimit-Limit", String(opts.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, opts.max - entry.count)));
    if (entry.count > opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new ApiError(
        429,
        opts.code ?? "RATE_LIMITED",
        "Too many requests, slow down",
        { retryAfterSeconds: retryAfter },
        { "Retry-After": String(retryAfter) },
      );
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Route planner (corridor search along the straight line origin → destination)
// ---------------------------------------------------------------------------

const ROAD_FACTOR = 1.25; // straight-line → rough road distance
const AVG_SPEED_KMH = 55;
const RESERVE_SOC = 10;
const MAX_TARGET_SOC = 80;
const CORRIDOR_KM = 20;
const MIN_DC_KW = 25;
const MIN_ADVANCE_KM = 15; // a stop must move you at least this far along, or it is not worth stopping

const routePlanSchema = z.object({
  origin: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  destination: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
  vehicle: z
    .object({
      batteryKwh: z.number().min(1).max(300).default(40.5),
      currentSocPercent: z.number().min(0).max(100).default(70),
      efficiencyKmPerKwh: z.number().min(0.5).max(60).default(6.5),
      maxChargeKw: z.number().min(1).max(350).default(50),
      connector: z.string().trim().max(30).optional(),
    })
    .default({}),
});

type RoutePlanInput = z.infer<typeof routePlanSchema>;

function planRoute(input: RoutePlanInput, all: Station[], dto: (s: Station) => object) {
  const { origin, destination, vehicle: v } = input;
  const straightKm = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const roadKm = straightKm * ROAD_FACTOR;
  const socDrop = (km: number) => (km / v.efficiencyKmPerKwh / v.batteryKwh) * 100;
  const reachKm = (soc: number) =>
    Math.max(0, ((soc - RESERVE_SOC) / 100) * v.batteryKwh * v.efficiencyKmPerKwh);

  const candidates = all
    .filter((s) => s.status !== "offline" && s.maxPowerKw >= MIN_DC_KW)
    .filter(
      (s) =>
        !v.connector ||
        s.connectors.some((c) => c.toLowerCase().includes(v.connector!.toLowerCase())),
    )
    .map((s) => ({ s, ...projectOnSegment(origin, destination, s) }))
    .filter((c) => c.off <= CORRIDOR_KM && c.t > 0.01 && c.t < 0.99);

  const stops: object[] = [];
  const warnings: string[] = [];
  let soc = v.currentSocPercent;
  let progress = 0;
  let feasible = true;
  let arrivalSoc = soc;

  for (let guard = 0; guard < 12; guard++) {
    const remainingKm = roadKm * (1 - progress);
    if (remainingKm <= reachKm(soc)) {
      arrivalSoc = soc - socDrop(remainingKm);
      break;
    }

    let best: { c: (typeof candidates)[number]; legKm: number; score: number } | null = null;
    for (const c of candidates) {
      if (roadKm * (c.t - progress) < MIN_ADVANCE_KM) continue;
      const legKm = roadKm * (c.t - progress) + c.off * ROAD_FACTOR * 2;
      if (legKm > reachKm(soc)) continue;
      // progress in km, plus up to 25 km-equivalent bonus for faster charging
      const score = roadKm * c.t + (Math.min(c.s.maxPowerKw, 150) / 150) * 25;
      if (!best || score > best.score) best = { c, legKm, score };
    }

    if (!best) {
      feasible = false;
      warnings.push(
        stops.length === 0
          ? "No fast charger found within reach on this corridor. Charge before leaving or pick a closer destination."
          : "No fast charger found within reach of the last stop; the route cannot be completed on this charge plan.",
      );
      arrivalSoc = Math.max(0, soc - socDrop(remainingKm));
      break;
    }

    const arrivalAtStop = soc - socDrop(best.legKm);
    const remainingAfter = roadKm * (1 - best.c.t);
    const needed = socDrop(remainingAfter) + RESERVE_SOC + 5;
    const target = Math.min(
      MAX_TARGET_SOC,
      Math.max(Math.ceil(needed), Math.ceil(arrivalAtStop) + 5),
    );
    const energyKwh = ((target - arrivalAtStop) / 100) * v.batteryKwh;
    const avgKw = Math.min(best.c.s.maxPowerKw, v.maxChargeKw) * 0.75; // crude allowance for taper
    stops.push({
      stopNumber: stops.length + 1,
      station: dto(best.c.s),
      distanceFromStartKm: round1(roadKm * best.c.t),
      offRouteKm: round1(best.c.off),
      estimatedArrivalSoc: Math.round(arrivalAtStop),
      targetChargeSoc: target,
      chargeTimeMinutes: Math.ceil((energyKwh / avgKw) * 60),
      estimatedCostInr: Math.round(energyKwh * best.c.s.pricePerKwh),
    });
    soc = target;
    progress = best.c.t;
  }

  if (feasible && stops.length >= 12)
    warnings.push("Route needs an unusually high number of stops; check inputs.");

  const chargeMinutes = stops.reduce<number>(
    (sum, s) => sum + (s as { chargeTimeMinutes: number }).chargeTimeMinutes,
    0,
  );
  return {
    feasible,
    totalDistanceKm: round1(straightKm),
    estimatedRoadDistanceKm: round1(roadKm),
    estimatedDriveTimeMinutes: Math.round((roadKm / AVG_SPEED_KMH) * 60),
    estimatedChargingMinutes: chargeMinutes,
    stopsNeeded: stops.length > 0,
    recommendedStops: stops,
    arrivalDestinationSocPercent: Math.max(0, Math.round(arrivalSoc)),
    warnings,
    assumptions: {
      roadDistanceFactor: ROAD_FACTOR,
      averageSpeedKmh: AVG_SPEED_KMH,
      reserveSocPercent: RESERVE_SOC,
      corridorKm: CORRIDOR_KM,
      note: "Estimates from straight-line distance, not turn-by-turn routing or live charger availability.",
    },
  };
}

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

const otpSendSchema = z.object({ phone: phoneSchema }).strict();
const otpVerifySchema = z
  .object({
    phone: phoneSchema,
    otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
    fullName: z.string().trim().min(1).max(80).optional(),
  })
  .strict();
const refreshSchema = z.object({ refreshToken: z.string().min(20).max(2000) }).strict();

const profileSchema = z
  .object({
    fullName: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().email().max(120).nullable().optional(),
    avatarUrl: z.string().trim().url().max(500).startsWith("https://").nullable().optional(),
  })
  .strict()
  .refine((o) => Object.keys(o).length > 0, "Provide at least one field to update");

const vehicleSchema = z
  .object({
    brand: z.string().trim().min(1).max(50),
    model: z.string().trim().min(1).max(80),
    connectorType: z.string().trim().min(1).max(30),
    batteryKwh: z.number().min(1).max(300),
    regNumber: z.string().trim().max(20).optional(),
  })
  .strict();

const filterQuery = {
  connector: optStr(30),
  min_power_kw: optNum(0, 1000),
  network: optStr(60),
  status: z.preprocess(blankToUndefined, z.enum([...STATUS_VALUES, "all"]).optional()),
};

const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.preprocess(blankToUndefined, z.coerce.number().min(0.1).max(500).default(25)),
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(200).default(50)),
  ...filterQuery,
});

const boundsSchema = z
  .object({
    min_lat: z.coerce.number().min(-90).max(90),
    min_lng: z.coerce.number().min(-180).max(180),
    max_lat: z.coerce.number().min(-90).max(90),
    max_lng: z.coerce.number().min(-180).max(180),
    limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(500).default(200)),
    ...filterQuery,
  })
  .refine((q) => q.min_lat < q.max_lat && q.min_lng < q.max_lng, "min_* must be less than max_*");

const searchSchema = z.object({
  q: optStr(100),
  city: optStr(60),
  lat: optNum(-90, 90),
  lng: optNum(-180, 180),
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(25)),
  offset: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).default(0)),
});

const pageSchema = z.object({
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
  offset: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).default(0)),
});

const reserveSchema = z
  .object({
    portNumber: z.number().int().min(1).max(100).default(1),
    startTimeMinutesFromNow: z
      .number()
      .int()
      .min(0)
      .max(24 * 60)
      .default(15),
    durationMinutes: z.number().int().min(15).max(180).default(45),
  })
  .strict();

const reviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(500).default(""),
    plugCondition: z
      .enum(["working_perfect", "slow_charge", "broken_connector"])
      .default("working_perfect"),
  })
  .strict();

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

export function createApp(
  config: Config = loadConfig(),
  deps: { sms?: SmsSender; stations?: Station[] } = {},
) {
  const all = deps.stations ?? stationData;
  const stationById = new Map(all.map((s) => [s.id, s]));

  const sms: SmsSender =
    deps.sms ??
    (config.isProd
      ? {
          async send() {
            throw new ApiError(503, "SMS_NOT_CONFIGURED", "SMS provider is not configured");
          },
        }
      : {
          async send(phone, message) {
            console.log(`[sms:dev] to ${phone}: ${message}`);
          },
        });

  // --- in-memory stores ---
  const users = new Map<string, User>();
  const userIdByPhone = new Map<string, string>();
  const bookings: Booking[] = [];
  let reviews: Review[] = [];
  const otps = new Map<
    string,
    { hash: string; expiresAt: number; attempts: number; lastSentAt: number }
  >();
  const otpSendLog = new Map<string, number[]>();
  interface RefreshSession {
    userId: string;
    familyId: string;
    expiresAt: number;
    used: boolean;
    /** Tokens handed out when this one was rotated; replayed to a retry inside the grace window. */
    next?: ReturnType<typeof issueTokens> | undefined;
    usedAt?: number;
  }
  const refreshSessions = new Map<string, RefreshSession>();
  const revokedFamilies = new Map<string, number>();

  setInterval(() => {
    const now = Date.now();
    for (const [jti, s] of refreshSessions) if (s.expiresAt <= now) refreshSessions.delete(jti);
    for (const [fid, exp] of revokedFamilies) if (exp <= now) revokedFamilies.delete(fid);
    for (const [phone, rec] of otps) if (rec.expiresAt <= now) otps.delete(phone);
  }, 60_000).unref();

  // --- helpers ---
  const hashOtp = (phone: string, otp: string) =>
    createHmac("sha256", config.accessSecret).update(`${phone}:${otp}`).digest("hex");

  function revokeFamily(familyId: string) {
    revokedFamilies.set(familyId, Date.now() + config.refreshTtlSec * 1000);
  }

  function issueTokens(userId: string, familyId: string) {
    const base = {
      algorithm: "HS256" as const,
      subject: userId,
      issuer: ISSUER,
      audience: AUDIENCE,
    };
    const accessToken = jwt.sign({ typ: "access", sid: familyId }, config.accessSecret, {
      ...base,
      expiresIn: config.accessTtlSec,
    });
    const jti = randomUUID();
    const refreshToken = jwt.sign({ typ: "refresh", sid: familyId }, config.refreshSecret, {
      ...base,
      jwtid: jti,
      expiresIn: config.refreshTtlSec,
    });
    refreshSessions.set(jti, {
      userId,
      familyId,
      expiresAt: Date.now() + config.refreshTtlSec * 1000,
      used: false,
    });
    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer" as const,
      expiresIn: config.accessTtlSec,
      refreshExpiresIn: config.refreshTtlSec,
    };
  }

  const verifyOpts = { algorithms: ["HS256" as const], issuer: ISSUER, audience: AUDIENCE };

  function authenticate(required: boolean): RequestHandler {
    return (req, res, next) => {
      const header = req.headers.authorization;
      if (!header) {
        if (required) throw new ApiError(401, "UNAUTHENTICATED", "Missing bearer token");
        return next();
      }
      const match = /^Bearer\s+(.+)$/i.exec(header);
      if (!match)
        throw new ApiError(401, "INVALID_TOKEN", "Authorization header must be 'Bearer <token>'");
      let payload: jwt.JwtPayload;
      try {
        payload = jwt.verify(match[1]!, config.accessSecret, verifyOpts) as jwt.JwtPayload;
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError)
          throw new ApiError(401, "TOKEN_EXPIRED", "Access token expired");
        throw new ApiError(401, "INVALID_TOKEN", "Access token is invalid");
      }
      const user = payload.sub ? users.get(payload.sub) : undefined;
      if (payload["typ"] !== "access" || !user || revokedFamilies.has(String(payload["sid"]))) {
        throw new ApiError(401, "INVALID_TOKEN", "Access token is invalid");
      }
      res.locals["user"] = user;
      next();
    };
  }
  const requireAuth = authenticate(true);
  const optionalAuth = authenticate(false);
  const me = (res: Response) => res.locals["user"] as User;

  function stationDto(s: Station, extra: { distanceKm?: number; user?: User | undefined } = {}) {
    const { distanceKm: _precomputed, ...rest } = s; // dataset distance is not relative to the caller
    return {
      ...rest,
      ...(extra.distanceKm !== undefined ? { distanceKm: round1(extra.distanceKm) } : {}),
      isFavorite: extra.user ? extra.user.favorites.includes(s.id) : false,
    };
  }

  function getStation(id: string | string[] | undefined): Station {
    const s = typeof id === "string" ? stationById.get(id) : undefined;
    if (!s) throw new ApiError(404, "STATION_NOT_FOUND", "Station not found");
    return s;
  }

  const matchesFilters = (s: Station, f: z.infer<z.ZodObject<typeof filterQuery>>) =>
    (!f.connector ||
      s.connectors.some((c) => c.toLowerCase().includes(f.connector!.toLowerCase()))) &&
    (!f.min_power_kw || s.maxPowerKw >= f.min_power_kw) &&
    (!f.network ||
      f.network.toLowerCase() === "all" ||
      s.network.toLowerCase().includes(f.network.toLowerCase())) &&
    (!f.status || f.status === "all" || s.status === f.status);

  const effectiveStatus = (b: Booking): Booking["status"] =>
    b.status === "active" && Date.parse(b.scheduledEnd) < Date.now() ? "completed" : b.status;

  const bookingDto = (b: Booking) => {
    const s = stationById.get(b.stationId);
    return {
      id: b.id,
      stationId: b.stationId,
      portNumber: b.portNumber,
      scheduledStart: b.scheduledStart,
      scheduledEnd: b.scheduledEnd,
      status: effectiveStatus(b),
      createdAt: b.createdAt,
      station: s ? { id: s.id, name: s.name, address: s.address, lat: s.lat, lng: s.lng } : null,
    };
  };

  // --- app + global middleware ---
  const app = express();
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", config.trustProxy);

  app.use((req, res, next) => {
    const incoming = req.headers["x-request-id"];
    const id =
      typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    res.locals["requestId"] = id;
    res.setHeader("X-Request-Id", id);
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use(
    cors({
      origin: config.corsOrigins.length ? config.corsOrigins : config.isProd ? false : true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
      exposedHeaders: ["X-Request-Id", "Retry-After", "RateLimit-Remaining"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "20kb" }));
  app.use(rateLimit(config.limits.global));

  const noStore: RequestHandler = (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  };

  const v1 = express.Router();
  app.use("/api/v1", v1);
  v1.use(["/auth", "/user", "/bookings"], noStore);

  // ===== Auth =====
  const otpSendLimit = rateLimit({ ...config.limits.otpSend, code: "OTP_RATE_LIMITED" });
  const otpVerifyLimit = rateLimit({ ...config.limits.otpVerify, code: "OTP_RATE_LIMITED" });

  v1.post("/auth/otp/send", otpSendLimit, async (req, res) => {
    const { phone } = parse(otpSendSchema, req.body);
    const now = Date.now();

    const existing = otps.get(phone);
    if (existing && now - existing.lastSentAt < config.otpResendCooldownMs) {
      const wait = Math.ceil((config.otpResendCooldownMs - (now - existing.lastSentAt)) / 1000);
      throw new ApiError(
        429,
        "OTP_COOLDOWN",
        `Wait ${wait}s before requesting another code`,
        { retryAfterSeconds: wait },
        {
          "Retry-After": String(wait),
        },
      );
    }
    const recent = (otpSendLog.get(phone) ?? []).filter((t) => now - t < 3_600_000);
    if (recent.length >= OTP_MAX_SENDS_PER_HOUR) {
      throw new ApiError(
        429,
        "OTP_LIMIT",
        "Too many codes requested for this number, try again later",
      );
    }

    const otp = String(randomInt(100_000, 1_000_000));
    otps.set(phone, {
      hash: hashOtp(phone, otp),
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
    });
    otpSendLog.set(phone, [...recent, now]);
    try {
      await sms.send(phone, `Your India EV Finder code is ${otp}. It is valid for 5 minutes.`);
    } catch (err) {
      otps.delete(phone);
      if (err instanceof ApiError) throw err;
      console.error("[sms] send failed", err);
      throw new ApiError(502, "SMS_FAILED", "Could not send the verification code");
    }
    ok(res, {
      phone,
      expiresInSeconds: OTP_TTL_MS / 1000,
      resendAfterSeconds: config.otpResendCooldownMs / 1000,
      ...(config.allowDemoOtp ? { demoOtp: otp } : {}),
    });
  });

  v1.post("/auth/otp/verify", otpVerifyLimit, (req, res) => {
    const { phone, otp, fullName } = parse(otpVerifySchema, req.body);
    const now = Date.now();
    const rec = otps.get(phone);
    if (!rec || rec.expiresAt <= now)
      throw new ApiError(400, "OTP_INVALID", "Invalid or expired code");
    if (rec.attempts >= OTP_MAX_ATTEMPTS) {
      otps.delete(phone);
      throw new ApiError(
        429,
        "OTP_ATTEMPTS_EXCEEDED",
        "Too many wrong attempts, request a new code",
      );
    }
    rec.attempts += 1;
    const given = Buffer.from(hashOtp(phone, otp));
    const wanted = Buffer.from(rec.hash);
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
      throw new ApiError(400, "OTP_INVALID", "Invalid or expired code");
    }
    otps.delete(phone);

    let user = users.get(userIdByPhone.get(phone) ?? "");
    const isNewUser = !user;
    if (!user) {
      user = {
        id: `usr_${randomBytes(8).toString("hex")}`,
        phone,
        email: null,
        fullName: fullName ?? "EV Driver",
        avatarUrl: null,
        vehicles: [],
        favorites: [],
        createdAt: new Date().toISOString(),
      };
      users.set(user.id, user);
      userIdByPhone.set(phone, user.id);
    }
    ok(res, { user, tokens: issueTokens(user.id, randomUUID()), isNewUser });
  });

  v1.post("/auth/refresh", (req, res) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, config.refreshSecret, verifyOpts) as jwt.JwtPayload;
    } catch {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }
    const session = payload.jti ? refreshSessions.get(payload.jti) : undefined;
    if (payload["typ"] !== "refresh" || !session || !users.has(session.userId)) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }
    if (revokedFamilies.has(session.familyId)) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Session ended, please sign in again");
    }
    if (session.used) {
      // Same token presented again right after rotating: the app probably lost our response on a bad
      // network, so hand back the same new tokens. Outside the grace window assume theft.
      if (session.next && Date.now() - (session.usedAt ?? 0) <= config.refreshReuseGraceMs) {
        ok(res, { tokens: session.next });
        return;
      }
      revokeFamily(session.familyId);
      throw new ApiError(401, "REFRESH_TOKEN_REUSED", "Session revoked, please sign in again");
    }
    const tokens = issueTokens(session.userId, session.familyId);
    session.used = true;
    if (config.refreshReuseGraceMs > 0) {
      session.usedAt = Date.now();
      session.next = tokens;
      setTimeout(() => {
        session.next = undefined;
      }, config.refreshReuseGraceMs).unref();
    }
    ok(res, { tokens });
  });

  v1.post("/auth/logout", (req, res) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    try {
      const payload = jwt.verify(refreshToken, config.refreshSecret, verifyOpts) as jwt.JwtPayload;
      if (payload["sid"]) revokeFamily(String(payload["sid"]));
    } catch {
      /* already invalid – logging out is idempotent */
    }
    ok(res, { loggedOut: true });
  });

  // ===== Profile, garage, favorites, account =====
  v1.get("/user/profile", requireAuth, (_req, res) => ok(res, me(res)));

  v1.put("/user/profile", requireAuth, (req, res) => {
    const patch = parse(profileSchema, req.body);
    const user = me(res);
    if (patch.fullName !== undefined) user.fullName = patch.fullName;
    if (patch.email !== undefined) user.email = patch.email;
    if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl;
    ok(res, user);
  });

  v1.delete("/user/account", requireAuth, (_req, res) => {
    const user = me(res);
    for (const s of refreshSessions.values()) if (s.userId === user.id) revokeFamily(s.familyId);
    for (let i = bookings.length - 1; i >= 0; i--)
      if (bookings[i]!.userId === user.id) bookings.splice(i, 1);
    reviews = reviews.filter((r) => r.userId !== user.id);
    userIdByPhone.delete(user.phone);
    users.delete(user.id);
    res.status(204).end();
  });

  v1.get("/user/vehicles", requireAuth, (_req, res) => ok(res, me(res).vehicles));

  v1.post("/user/vehicles", requireAuth, (req, res) => {
    const user = me(res);
    const body = parse(vehicleSchema, req.body);
    if (user.vehicles.length >= MAX_VEHICLES) {
      throw new ApiError(409, "VEHICLE_LIMIT", `You can save up to ${MAX_VEHICLES} vehicles`);
    }
    const vehicle: Vehicle = { id: `veh_${randomBytes(6).toString("hex")}`, ...body };
    user.vehicles.push(vehicle);
    ok(res, vehicle, undefined, 201);
  });

  v1.put("/user/vehicles/:id", requireAuth, (req, res) => {
    const user = me(res);
    const idx = user.vehicles.findIndex((v) => v.id === req.params["id"]);
    if (idx < 0) throw new ApiError(404, "VEHICLE_NOT_FOUND", "Vehicle not found");
    const updated: Vehicle = { id: user.vehicles[idx]!.id, ...parse(vehicleSchema, req.body) };
    user.vehicles[idx] = updated;
    ok(res, updated);
  });

  v1.delete("/user/vehicles/:id", requireAuth, (req, res) => {
    const user = me(res);
    const before = user.vehicles.length;
    user.vehicles = user.vehicles.filter((v) => v.id !== req.params["id"]);
    if (user.vehicles.length === before)
      throw new ApiError(404, "VEHICLE_NOT_FOUND", "Vehicle not found");
    res.status(204).end();
  });

  v1.get("/user/favorites", requireAuth, (_req, res) => {
    const user = me(res);
    const list = user.favorites.flatMap((id) => {
      const s = stationById.get(id);
      return s ? [stationDto(s, { user })] : [];
    });
    ok(res, list, { count: list.length });
  });

  v1.post("/user/favorites/:stationId", requireAuth, (req, res) => {
    const user = me(res);
    const station = getStation(req.params["stationId"]);
    if (!user.favorites.includes(station.id)) user.favorites.push(station.id);
    ok(res, { stationId: station.id, favorites: user.favorites });
  });

  v1.delete("/user/favorites/:stationId", requireAuth, (req, res) => {
    const user = me(res);
    user.favorites = user.favorites.filter((id) => id !== req.params["stationId"]);
    ok(res, { stationId: req.params["stationId"], favorites: user.favorites });
  });

  // ===== Station discovery (public; token optional so isFavorite can be filled in) =====
  v1.get("/stations/nearby", optionalAuth, (req, res) => {
    const q = parse(nearbySchema, req.query);
    const user = res.locals["user"] as User | undefined;
    const results = all
      .map((s) => ({ s, d: haversineKm(q.lat, q.lng, s.lat, s.lng) }))
      .filter(({ s, d }) => d <= q.radius_km && matchesFilters(s, q))
      .sort((a, b) => a.d - b.d)
      .slice(0, q.limit)
      .map(({ s, d }) => stationDto(s, { distanceKm: d, user }));
    ok(res, results, { count: results.length, limit: q.limit, radiusKm: q.radius_km });
  });

  v1.get("/stations/bounds", optionalAuth, (req, res) => {
    const q = parse(boundsSchema, req.query);
    const user = res.locals["user"] as User | undefined;
    const inBox = all.filter(
      (s) =>
        s.lat >= q.min_lat &&
        s.lat <= q.max_lat &&
        s.lng >= q.min_lng &&
        s.lng <= q.max_lng &&
        matchesFilters(s, q),
    );
    const results = inBox.slice(0, q.limit).map((s) => stationDto(s, { user }));
    ok(res, results, {
      count: results.length,
      total: inBox.length,
      limit: q.limit,
      truncated: inBox.length > q.limit,
    });
  });

  v1.get("/stations/search", optionalAuth, (req, res) => {
    const q = parse(searchSchema, req.query);
    const user = res.locals["user"] as User | undefined;
    const term = q.q?.toLowerCase();
    const city = q.city?.toLowerCase();
    let matches = all.filter(
      (s) =>
        (!city || city === "all" || city === "all india" || s.city.toLowerCase().includes(city)) &&
        (!term ||
          s.name.toLowerCase().includes(term) ||
          s.address.toLowerCase().includes(term) ||
          s.network.toLowerCase().includes(term) ||
          s.city.toLowerCase().includes(term) ||
          s.pincode.includes(term)),
    );
    const withDistance = q.lat !== undefined && q.lng !== undefined;
    const ranked = matches.map((s) => ({
      s,
      d: withDistance ? haversineKm(q.lat!, q.lng!, s.lat, s.lng) : undefined,
    }));
    if (withDistance) ranked.sort((a, b) => a.d! - b.d!);
    const page = ranked
      .slice(q.offset, q.offset + q.limit)
      .map(({ s, d }) => stationDto(s, { user, ...(d !== undefined ? { distanceKm: d } : {}) }));
    ok(res, page, { count: page.length, total: matches.length, limit: q.limit, offset: q.offset });
  });

  v1.get("/stations/:id", optionalAuth, (req, res) => {
    const station = getStation(req.params["id"]);
    const user = res.locals["user"] as User | undefined;
    const stationReviews = reviews.filter((r) => r.stationId === station.id).slice(0, 20);
    const ports = Array.from({ length: station.totalPorts }, (_, i) => ({
      portNumber: i + 1,
      connectorType: station.connectors[i % station.connectors.length] ?? "CCS2",
      maxPowerKw: station.maxPowerKw,
      status: i < station.freePorts ? "available" : "occupied",
      pricePerKwh: station.pricePerKwh,
    }));
    ok(res, {
      ...stationDto(station, { user }),
      ports,
      liveTelemetry: false, // port states are derived from freePorts/totalPorts, not read from the charger
      recentReviews: stationReviews, // `reviews` stays the numeric review count from the dataset
    });
  });

  // ===== Reviews =====
  v1.get("/stations/:id/reviews", (req, res) => {
    const station = getStation(req.params["id"]);
    const { limit, offset } = parse(pageSchema, req.query);
    const list = reviews.filter((r) => r.stationId === station.id);
    ok(res, list.slice(offset, offset + limit), { total: list.length, limit, offset });
  });

  v1.post("/stations/:id/reviews", requireAuth, (req, res) => {
    const station = getStation(req.params["id"]);
    const user = me(res);
    const body = parse(reviewSchema, req.body);
    if (reviews.some((r) => r.stationId === station.id && r.userId === user.id)) {
      throw new ApiError(409, "ALREADY_REVIEWED", "You have already reviewed this station");
    }
    const review: Review = {
      id: `rev_${randomBytes(6).toString("hex")}`,
      stationId: station.id,
      userId: user.id,
      userName: user.fullName,
      createdAt: new Date().toISOString(),
      ...body,
    };
    reviews.unshift(review);
    ok(res, review, undefined, 201);
  });

  // ===== Reservations =====
  v1.post("/stations/:id/reserve", requireAuth, (req, res) => {
    const station = getStation(req.params["id"]);
    const user = me(res);
    const body = parse(reserveSchema, req.body);
    if (station.status === "offline")
      throw new ApiError(409, "STATION_OFFLINE", "Station is offline");
    if (body.portNumber > station.totalPorts) {
      throw new ApiError(400, "INVALID_PORT", `This station has ${station.totalPorts} port(s)`);
    }

    const start = Date.now() + body.startTimeMinutesFromNow * 60_000;
    const end = start + body.durationMinutes * 60_000;
    const live = bookings.filter((b) => effectiveStatus(b) === "active");
    if (live.filter((b) => b.userId === user.id).length >= MAX_ACTIVE_BOOKINGS) {
      throw new ApiError(
        409,
        "BOOKING_LIMIT",
        `You can hold up to ${MAX_ACTIVE_BOOKINGS} active reservations`,
      );
    }
    const clash = live.some(
      (b) =>
        b.stationId === station.id &&
        b.portNumber === body.portNumber &&
        start < Date.parse(b.scheduledEnd) &&
        end > Date.parse(b.scheduledStart),
    );
    if (clash) throw new ApiError(409, "SLOT_TAKEN", "That port is already reserved for this time");

    const booking: Booking = {
      id: `bk_${randomBytes(6).toString("hex")}`,
      userId: user.id,
      stationId: station.id,
      portNumber: body.portNumber,
      scheduledStart: new Date(start).toISOString(),
      scheduledEnd: new Date(end).toISOString(),
      status: "active",
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    ok(res, bookingDto(booking), undefined, 201);
  });

  v1.get("/bookings/my", requireAuth, (req, res) => {
    const status = parse(
      z.object({ status: z.enum(["active", "completed", "cancelled"]).optional() }),
      req.query,
    ).status;
    const list = bookings
      .filter((b) => b.userId === me(res).id)
      .map(bookingDto)
      .filter((b) => !status || b.status === status)
      .sort((a, b) => b.scheduledStart.localeCompare(a.scheduledStart));
    ok(res, list, { count: list.length });
  });

  v1.delete("/bookings/:id", requireAuth, (req, res) => {
    const booking = bookings.find((b) => b.id === req.params["id"] && b.userId === me(res).id);
    if (!booking) throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found");
    if (effectiveStatus(booking) !== "active") {
      throw new ApiError(
        409,
        "BOOKING_NOT_CANCELLABLE",
        `Booking is already ${effectiveStatus(booking)}`,
      );
    }
    booking.status = "cancelled";
    ok(res, bookingDto(booking));
  });

  // ===== Route planner =====
  v1.post("/routes/plan", optionalAuth, (req, res) => {
    const input = parse(routePlanSchema, req.body);
    const user = res.locals["user"] as User | undefined;
    ok(
      res,
      planRoute(input, all, (s) => stationDto(s, { user })),
    );
  });

  // ===== Health & docs =====
  v1.get("/health", (_req, res) =>
    res.json({
      status: "online",
      service: "India EV Finder REST API",
      version: "1.0.0",
      stations: all.length,
      timestamp: new Date().toISOString(),
    }),
  );

  v1.get("/openapi.json", (_req, res) => {
    try {
      const spec = JSON.parse(readFileSync(new URL("./openapi.json", import.meta.url), "utf8"));
      res.json(spec);
    } catch {
      throw new ApiError(404, "NOT_FOUND", "OpenAPI spec not available");
    }
  });

  // ===== 404 + error handling =====
  app.use((req, _res, next) =>
    next(new ApiError(404, "NOT_FOUND", `No route for ${req.method} ${req.path}`)),
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const requestId = res.locals["requestId"] as string | undefined;
    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong";
    let details: unknown;

    if (err instanceof ApiError) {
      ({ status, code, message, details } = err);
      for (const [k, v] of Object.entries(err.headers ?? {})) res.setHeader(k, v);
    } else if (typeof err === "object" && err !== null && "type" in err) {
      const type = (err as { type: string }).type;
      if (type === "entity.parse.failed")
        [status, code, message] = [400, "INVALID_JSON", "Request body is not valid JSON"];
      else if (type === "entity.too.large")
        [status, code, message] = [413, "PAYLOAD_TOO_LARGE", "Request body too large"];
    }
    if (status === 500) console.error(`[error] ${requestId}`, err);

    res.status(status).json({
      success: false,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
      requestId,
    });
  });

  return app;
}

// ---------------------------------------------------------------------------
// Start the server when run directly (npm run api:dev)
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const config = loadConfig();
  createApp(config).listen(config.port, () => {
    console.log(
      `India EV Finder API on http://localhost:${config.port}/api/v1  (${stationData.length} stations)`,
    );
    if (config.isProd && !config.trustProxy) {
      console.warn(
        "[config] TRUST_PROXY is not set. Behind a reverse proxy every user then shares one IP and one rate-limit bucket; set TRUST_PROXY=1.",
      );
    }
    if (!config.isProd && !config.allowDemoOtp) {
      console.log(
        "Dev tip: OTPs are printed in this console. Set ALLOW_DEMO_OTP=true to also return them in the response.",
      );
    }
  });
}

export default createApp;
