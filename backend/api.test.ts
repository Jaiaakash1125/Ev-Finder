import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { readFileSync } from "node:fs";
import jwt from "jsonwebtoken";
import { createApp, loadConfig, type Config, type SmsSender } from "./api-server";
import { stations } from "../src/data/stations";

const ACCESS_SECRET = "a".repeat(48);
const REFRESH_SECRET = "r".repeat(48);

const testConfig = (over: Partial<Config["limits"]> = {}): Config => {
  const base = loadConfig({
    NODE_ENV: "test",
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
  });
  const big = { windowMs: 60_000, max: 1_000_000 };
  return {
    ...base,
    refreshReuseGraceMs: 0,
    limits: { global: big, otpSend: big, otpVerify: big, ...over },
  };
};

const sentOtps = new Map<string, string>();
const sms: SmsSender = {
  async send(phone, message) {
    sentOtps.set(phone, /(\d{6})/.exec(message)![1]!);
  },
};

let phoneCounter = 0;
const newPhone = () =>
  `+9199${String(10_000_000 + ++phoneCounter + Math.floor(Math.random() * 1_000_000)).slice(0, 8)}`;

interface Res {
  status: number;
  body: any;
  headers: Headers;
}

function client(baseUrl: string) {
  async function call(
    method: string,
    path: string,
    opts: { body?: unknown; token?: string; raw?: string } = {},
  ): Promise<Res> {
    const headers: Record<string, string> = {};
    if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
    if (opts.body !== undefined || opts.raw !== undefined)
      headers["Content-Type"] = "application/json";
    const res = await fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers,
      ...(opts.raw !== undefined
        ? { body: opts.raw }
        : opts.body !== undefined
          ? { body: JSON.stringify(opts.body) }
          : {}),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
  }

  async function login(fullName = "Test Driver") {
    const phone = newPhone();
    const sent = await call("POST", "/auth/otp/send", { body: { phone } });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    const verified = await call("POST", "/auth/otp/verify", {
      body: { phone, otp: sentOtps.get(phone), fullName },
    });
    assert.equal(verified.status, 200, JSON.stringify(verified.body));
    return {
      phone,
      user: verified.body.data.user,
      tokens: verified.body.data.tokens as Record<string, any>,
    };
  }

  return { call, login };
}

let server: Server;
let api: ReturnType<typeof client>;

before(async () => {
  const app = createApp(testConfig(), { sms });
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  api = client(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
});
after(() => server.close());

describe("basics", () => {
  it("serves health and JSON 404s", async () => {
    const health = await api.call("GET", "/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "online");
    assert.ok(health.body.stations > 100);

    const missing = await api.call("GET", "/nope");
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, "NOT_FOUND");
    assert.ok(missing.body.requestId);
  });

  it("rejects malformed JSON", async () => {
    const res = await api.call("POST", "/auth/otp/send", { raw: "{not json" });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "INVALID_JSON");
  });

  it("documents every route in openapi.json (and nothing that does not exist)", () => {
    const source = readFileSync(new URL("./api-server.ts", import.meta.url), "utf8");
    const routes = new Set(
      [...source.matchAll(/v1\.(get|post|put|delete)\("([^"]+)"/g)].map(
        (m) => `${m[1]!.toUpperCase()} ${m[2]!.replace(/:(\w+)/g, "{$1}")}`,
      ),
    );
    const spec = JSON.parse(readFileSync(new URL("./openapi.json", import.meta.url), "utf8"));
    const documented = new Set(
      Object.entries<Record<string, unknown>>(spec.paths).flatMap(([path, ops]) =>
        Object.keys(ops).map((m) => `${m.toUpperCase()} ${path}`),
      ),
    );
    assert.deepEqual(
      [...routes].filter((r) => !documented.has(r)),
      [],
      "routes missing from openapi.json",
    );
    assert.deepEqual(
      [...documented].filter((r) => !routes.has(r)),
      [],
      "openapi.json documents routes that do not exist",
    );
    assert.ok(routes.size >= 20);
  });

  it("serves the OpenAPI spec", async () => {
    const res = await api.call("GET", "/openapi.json");
    assert.equal(res.status, 200);
    assert.equal(res.body.openapi, "3.0.3");
  });
});

describe("OTP login", () => {
  it("validates the phone number", async () => {
    const res = await api.call("POST", "/auth/otp/send", { body: { phone: "9876543210" } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  });

  it("never returns the OTP unless demo mode is on", async () => {
    const res = await api.call("POST", "/auth/otp/send", { body: { phone: newPhone() } });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.demoOtp, undefined);
  });

  it("does not accept a magic OTP", async () => {
    const phone = newPhone();
    // No code requested at all
    let res = await api.call("POST", "/auth/otp/verify", { body: { phone, otp: "123456" } });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, "OTP_INVALID");
    // Code requested, but a different one submitted
    await api.call("POST", "/auth/otp/send", { body: { phone } });
    const wrong = sentOtps.get(phone) === "123456" ? "654321" : "123456";
    res = await api.call("POST", "/auth/otp/verify", { body: { phone, otp: wrong } });
    assert.equal(res.status, 400);
  });

  it("creates a new user on first login", async () => {
    const first = await api.login("Asha");
    assert.equal(first.user.fullName, "Asha");
    assert.deepEqual(first.user.vehicles, []);
    assert.equal(first.tokens["tokenType"], "Bearer");

    const profile = await api.call("GET", "/user/profile", { token: first.tokens["accessToken"] });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.phone, first.phone);
  });

  it("signs a returning user into the same account", async () => {
    const app = createApp({ ...testConfig(), otpResendCooldownMs: 0 }, { sms });
    const s = app.listen(0);
    await new Promise((r) => s.once("listening", r));
    const c = client(`http://127.0.0.1:${(s.address() as AddressInfo).port}`);
    try {
      const phone = newPhone();
      const loginOnce = async (fullName?: string) => {
        await c.call("POST", "/auth/otp/send", { body: { phone } });
        const res = await c.call("POST", "/auth/otp/verify", {
          body: { phone, otp: sentOtps.get(phone), ...(fullName ? { fullName } : {}) },
        });
        assert.equal(res.status, 200);
        return res.body.data;
      };
      const first = await loginOnce("Original Name");
      const second = await loginOnce("Ignored On Return");
      assert.equal(first.isNewUser, true);
      assert.equal(second.isNewUser, false);
      assert.equal(second.user.id, first.user.id);
      assert.equal(second.user.fullName, "Original Name");
      // both sessions are independent
      assert.equal(
        (await c.call("GET", "/user/profile", { token: first.tokens.accessToken })).status,
        200,
      );
      assert.equal(
        (await c.call("GET", "/user/profile", { token: second.tokens.accessToken })).status,
        200,
      );
    } finally {
      s.close();
    }
  });

  it("enforces resend cooldown", async () => {
    const phone = newPhone();
    assert.equal((await api.call("POST", "/auth/otp/send", { body: { phone } })).status, 200);
    const again = await api.call("POST", "/auth/otp/send", { body: { phone } });
    assert.equal(again.status, 429);
    assert.equal(again.body.error.code, "OTP_COOLDOWN");
    assert.ok(again.headers.get("retry-after"));
  });

  it("locks the code after 5 wrong attempts, even if the right one follows", async () => {
    const phone = newPhone();
    await api.call("POST", "/auth/otp/send", { body: { phone } });
    const right = sentOtps.get(phone)!;
    const wrong = right === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      const r = await api.call("POST", "/auth/otp/verify", { body: { phone, otp: wrong } });
      assert.equal(r.status, 400);
    }
    const locked = await api.call("POST", "/auth/otp/verify", { body: { phone, otp: right } });
    assert.equal(locked.status, 429);
    assert.equal(locked.body.error.code, "OTP_ATTEMPTS_EXCEEDED");
  });

  it("a code works only once", async () => {
    const phone = newPhone();
    await api.call("POST", "/auth/otp/send", { body: { phone } });
    const otp = sentOtps.get(phone)!;
    assert.equal(
      (await api.call("POST", "/auth/otp/verify", { body: { phone, otp } })).status,
      200,
    );
    assert.equal(
      (await api.call("POST", "/auth/otp/verify", { body: { phone, otp } })).status,
      400,
    );
  });
});

describe("tokens", () => {
  it("rejects missing, garbage, forged and wrong-type tokens", async () => {
    const { user, tokens } = await api.login();
    assert.equal((await api.call("GET", "/user/profile")).body.error.code, "UNAUTHENTICATED");
    assert.equal(
      (await api.call("GET", "/user/profile", { token: "garbage" })).body.error.code,
      "INVALID_TOKEN",
    );

    const claims = { typ: "access", sid: "x" };
    const opts = {
      subject: user.id,
      issuer: "evfinder-api",
      audience: "evfinder-mobile",
      expiresIn: 600,
    } as const;
    const forged = jwt.sign(claims, "wrong-secret-wrong-secret-wrong-secret!", opts);
    assert.equal(
      (await api.call("GET", "/user/profile", { token: forged })).body.error.code,
      "INVALID_TOKEN",
    );

    const unsigned = jwt.sign(claims, "", { ...opts, algorithm: "none" });
    assert.equal((await api.call("GET", "/user/profile", { token: unsigned })).status, 401);

    // The old hard-coded secret from the prototype must not work
    const legacy = jwt.sign(
      { id: user.id, phone: user.phone },
      "india_ev_finder_super_secure_jwt_secret_2026",
    );
    assert.equal((await api.call("GET", "/user/profile", { token: legacy })).status, 401);

    // A refresh token is not an access token and vice versa
    assert.equal(
      (await api.call("GET", "/user/profile", { token: tokens["refreshToken"] })).status,
      401,
    );
    assert.equal(
      (await api.call("POST", "/auth/refresh", { body: { refreshToken: tokens["accessToken"] } }))
        .status,
      401,
    );
  });

  it("reports expired access tokens distinctly so the app knows to refresh", async () => {
    const { user } = await api.login();
    const expired = jwt.sign({ typ: "access", sid: "x" }, ACCESS_SECRET, {
      subject: user.id,
      issuer: "evfinder-api",
      audience: "evfinder-mobile",
      expiresIn: -10,
    });
    const res = await api.call("GET", "/user/profile", { token: expired });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "TOKEN_EXPIRED");
    // Optional-auth routes must also surface it rather than silently treating the user as anonymous
    const stationsRes = await api.call("GET", "/stations/search?q=a", { token: expired });
    assert.equal(stationsRes.body.error.code, "TOKEN_EXPIRED");
  });

  it("rotates refresh tokens and revokes the login if an old one is replayed", async () => {
    const { tokens } = await api.login();
    const r1 = await api.call("POST", "/auth/refresh", {
      body: { refreshToken: tokens["refreshToken"] },
    });
    assert.equal(r1.status, 200);
    const next = r1.body.data.tokens;
    assert.notEqual(next.refreshToken, tokens["refreshToken"]);
    assert.equal((await api.call("GET", "/user/profile", { token: next.accessToken })).status, 200);

    // Replay of the already-used token → whole family revoked
    const replay = await api.call("POST", "/auth/refresh", {
      body: { refreshToken: tokens["refreshToken"] },
    });
    assert.equal(replay.status, 401);
    assert.equal(replay.body.error.code, "REFRESH_TOKEN_REUSED");
    assert.equal(
      (await api.call("POST", "/auth/refresh", { body: { refreshToken: next.refreshToken } }))
        .status,
      401,
    );
    assert.equal((await api.call("GET", "/user/profile", { token: next.accessToken })).status, 401);
  });

  it("tolerates a retried refresh inside the grace window (lost response on a bad network)", async () => {
    const app = createApp({ ...testConfig(), refreshReuseGraceMs: 5_000 }, { sms });
    const s = app.listen(0);
    await new Promise((r) => s.once("listening", r));
    const c = client(`http://127.0.0.1:${(s.address() as AddressInfo).port}`);
    try {
      const { tokens } = await c.login();
      const a = await c.call("POST", "/auth/refresh", {
        body: { refreshToken: tokens["refreshToken"] },
      });
      const b = await c.call("POST", "/auth/refresh", {
        body: { refreshToken: tokens["refreshToken"] },
      });
      assert.equal(a.status, 200);
      assert.equal(b.status, 200);
      assert.equal(b.body.data.tokens.refreshToken, a.body.data.tokens.refreshToken);
      // and the session still works afterwards
      assert.equal(
        (
          await c.call("POST", "/auth/refresh", {
            body: { refreshToken: a.body.data.tokens.refreshToken },
          })
        ).status,
        200,
      );
    } finally {
      s.close();
    }
  });

  it("logout revokes the session immediately", async () => {
    const { tokens } = await api.login();
    const out = await api.call("POST", "/auth/logout", {
      body: { refreshToken: tokens["refreshToken"] },
    });
    assert.equal(out.status, 200);
    assert.equal(
      (await api.call("GET", "/user/profile", { token: tokens["accessToken"] })).status,
      401,
    );
    assert.equal(
      (await api.call("POST", "/auth/refresh", { body: { refreshToken: tokens["refreshToken"] } }))
        .status,
      401,
    );
  });
});

describe("profile and garage", () => {
  it("updates the profile with validation", async () => {
    const { tokens } = await api.login();
    const token = tokens["accessToken"];
    const ok = await api.call("PUT", "/user/profile", {
      token,
      body: { fullName: "New Name", email: "a@b.in" },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.email, "a@b.in");
    assert.equal(
      (await api.call("PUT", "/user/profile", { token, body: { email: "nope" } })).status,
      400,
    );
    assert.equal((await api.call("PUT", "/user/profile", { token, body: {} })).status, 400);
    assert.equal(
      (await api.call("PUT", "/user/profile", { token, body: { phone: "+911234567890" } })).status,
      400,
    );
    assert.equal(
      (await api.call("PUT", "/user/profile", { token, body: { avatarUrl: "http://x.in/a.png" } }))
        .status,
      400,
    );
  });

  it("manages vehicles", async () => {
    const { tokens } = await api.login();
    const token = tokens["accessToken"];
    const car = { brand: "Tata", model: "Nexon EV", connectorType: "CCS2", batteryKwh: 40.5 };
    const created = await api.call("POST", "/user/vehicles", { token, body: car });
    assert.equal(created.status, 201);
    const id = created.body.data.id;
    assert.equal(
      (await api.call("POST", "/user/vehicles", { token, body: { ...car, batteryKwh: -1 } }))
        .status,
      400,
    );

    const updated = await api.call("PUT", `/user/vehicles/${id}`, {
      token,
      body: { ...car, model: "Nexon Max" },
    });
    assert.equal(updated.body.data.model, "Nexon Max");
    assert.equal((await api.call("GET", "/user/vehicles", { token })).body.data.length, 1);
    assert.equal((await api.call("DELETE", `/user/vehicles/${id}`, { token })).status, 204);
    assert.equal((await api.call("DELETE", `/user/vehicles/${id}`, { token })).status, 404);
  });

  it("deletes the account and everything with it", async () => {
    const { tokens, phone } = await api.login();
    const token = tokens["accessToken"];
    assert.equal((await api.call("DELETE", "/user/account", { token })).status, 204);
    assert.equal((await api.call("GET", "/user/profile", { token })).status, 401);
    assert.equal(
      (await api.call("POST", "/auth/refresh", { body: { refreshToken: tokens["refreshToken"] } }))
        .status,
      401,
    );
    assert.ok(phone);
  });
});

describe("station discovery", () => {
  it("finds nearby stations sorted by distance from the caller", async () => {
    const res = await api.call(
      "GET",
      "/stations/nearby?lat=12.9716&lng=77.5946&radius_km=30&limit=10",
    );
    assert.equal(res.status, 200);
    const list = res.body.data;
    assert.ok(list.length > 0);
    const dists = list.map((s: any) => s.distanceKm);
    assert.deepEqual(
      dists,
      [...dists].sort((a: number, b: number) => a - b),
    );
    assert.ok(dists.every((d: number) => d <= 30));
    assert.equal(list[0].isFavorite, false);
  });

  it("requires coordinates and rejects nonsense", async () => {
    assert.equal((await api.call("GET", "/stations/nearby")).status, 400);
    assert.equal((await api.call("GET", "/stations/nearby?lat=999&lng=0")).status, 400);
    assert.equal(
      (await api.call("GET", "/stations/nearby?lat=12&lng=77&limit=100000")).status,
      400,
    );
  });

  it("applies filters", async () => {
    const res = await api.call(
      "GET",
      "/stations/nearby?lat=12.9716&lng=77.5946&radius_km=50&min_power_kw=60&connector=ccs2&status=",
    );
    assert.equal(res.status, 200);
    for (const s of res.body.data) {
      assert.ok(s.maxPowerKw >= 60);
      assert.ok(s.connectors.some((c: string) => c.toLowerCase().includes("ccs2")));
    }
  });

  it("returns stations inside a map viewport", async () => {
    const res = await api.call(
      "GET",
      "/stations/bounds?min_lat=12.8&min_lng=77.4&max_lat=13.1&max_lng=77.8&limit=5",
    );
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length <= 5);
    for (const s of res.body.data)
      assert.ok(s.lat >= 12.8 && s.lat <= 13.1 && s.lng >= 77.4 && s.lng <= 77.8);
    assert.equal(
      (await api.call("GET", "/stations/bounds?min_lat=13&min_lng=77&max_lat=12&max_lng=78"))
        .status,
      400,
    );
  });

  it("searches with pagination", async () => {
    const page1 = await api.call("GET", "/stations/search?city=Mumbai&limit=3&offset=0");
    const page2 = await api.call("GET", "/stations/search?city=Mumbai&limit=3&offset=3");
    assert.equal(page1.status, 200);
    assert.equal(page1.body.data.length, 3);
    assert.ok(page1.body.meta.total >= 6);
    assert.notEqual(page1.body.data[0].id, page2.body.data[0].id);
    for (const s of page1.body.data) assert.equal(s.city, "Mumbai");
  });

  it("returns station detail with ports, and 404s unknown ids", async () => {
    const target = stations[0]!;
    const res = await api.call("GET", `/stations/${encodeURIComponent(target.id)}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.ports.length, target.totalPorts);
    assert.equal(res.body.data.liveTelemetry, false);
    assert.equal(
      typeof res.body.data.reviews,
      "number",
      "station.reviews must stay the numeric count",
    );
    assert.ok(Array.isArray(res.body.data.recentReviews));
    const missing = await api.call("GET", "/stations/does-not-exist");
    assert.equal(missing.body.error.code, "STATION_NOT_FOUND");
  });
});

describe("favorites, reservations and reviews", () => {
  const bookable = stations.find((s) => s.status !== "offline" && s.totalPorts >= 2)!;
  const sid = encodeURIComponent(bookable.id);

  it("manages favorites and reflects them in discovery", async () => {
    const { tokens } = await api.login();
    const token = tokens["accessToken"];
    assert.equal((await api.call("POST", `/user/favorites/${sid}`, { token })).status, 200);
    assert.equal((await api.call("POST", "/user/favorites/does-not-exist", { token })).status, 404);

    const list = await api.call("GET", "/user/favorites", { token });
    assert.equal(list.body.data.length, 1);
    const search = await api.call(
      "GET",
      `/stations/search?q=${encodeURIComponent(bookable.name)}&limit=50`,
      { token },
    );
    assert.equal(search.body.data.find((s: any) => s.id === bookable.id).isFavorite, true);

    await api.call("DELETE", `/user/favorites/${sid}`, { token });
    assert.equal((await api.call("GET", "/user/favorites", { token })).body.data.length, 0);
  });

  it("reserves a port, blocks double-booking, and lets only the owner cancel", async () => {
    const alice = (await api.login("Alice")).tokens["accessToken"];
    const bob = (await api.login("Bob")).tokens["accessToken"];
    const body = { portNumber: 1, startTimeMinutesFromNow: 600, durationMinutes: 60 };

    const booked = await api.call("POST", `/stations/${sid}/reserve`, { token: alice, body });
    assert.equal(booked.status, 201);
    assert.equal(booked.body.data.status, "active");
    assert.equal(booked.body.data.station.id, bookable.id);

    const clash = await api.call("POST", `/stations/${sid}/reserve`, {
      token: bob,
      body: { ...body, startTimeMinutesFromNow: 630 },
    });
    assert.equal(clash.status, 409);
    assert.equal(clash.body.error.code, "SLOT_TAKEN");

    const otherPort = await api.call("POST", `/stations/${sid}/reserve`, {
      token: bob,
      body: { ...body, portNumber: 2 },
    });
    assert.equal(otherPort.status, 201);

    const id = booked.body.data.id;
    assert.equal((await api.call("DELETE", `/bookings/${id}`, { token: bob })).status, 404);
    assert.equal(
      (await api.call("DELETE", `/bookings/${id}`, { token: alice })).body.data.status,
      "cancelled",
    );
    assert.equal(
      (await api.call("DELETE", `/bookings/${id}`, { token: alice })).body.error.code,
      "BOOKING_NOT_CANCELLABLE",
    );

    // Slot is free again
    assert.equal(
      (
        await api.call("POST", `/stations/${sid}/reserve`, {
          token: bob,
          body: { ...body, startTimeMinutesFromNow: 610 },
        })
      ).status,
      201,
    );
    assert.equal((await api.call("GET", "/bookings/my", { token: alice })).body.data.length, 1);
  });

  it("validates reservations", async () => {
    const token = (await api.login()).tokens["accessToken"];
    const bad = await api.call("POST", `/stations/${sid}/reserve`, {
      token,
      body: { portNumber: 99 },
    });
    assert.equal(bad.body.error.code, "INVALID_PORT");
    assert.equal(
      (await api.call("POST", `/stations/${sid}/reserve`, { token, body: { durationMinutes: 5 } }))
        .status,
      400,
    );
    assert.equal((await api.call("POST", `/stations/${sid}/reserve`, { body: {} })).status, 401);

    const offline = stations.find((s) => s.status === "offline");
    if (offline) {
      const res = await api.call("POST", `/stations/${encodeURIComponent(offline.id)}/reserve`, {
        token,
        body: {},
      });
      assert.equal(res.body.error.code, "STATION_OFFLINE");
    }
  });

  it("caps active reservations per user", async () => {
    const token = (await api.login()).tokens["accessToken"];
    const others = stations.filter((s) => s.status !== "offline").slice(10, 14);
    const codes: number[] = [];
    for (const s of others) {
      const r = await api.call("POST", `/stations/${encodeURIComponent(s.id)}/reserve`, {
        token,
        body: { startTimeMinutesFromNow: 900 },
      });
      codes.push(r.status);
    }
    assert.deepEqual(codes, [201, 201, 201, 409]);
  });

  it("accepts one review per user per station, with validation", async () => {
    const token = (await api.login("Reviewer")).tokens["accessToken"];
    const review = { rating: 4, comment: "Fast and clean", plugCondition: "working_perfect" };
    const created = await api.call("POST", `/stations/${sid}/reviews`, { token, body: review });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.userName, "Reviewer");
    assert.equal(
      (await api.call("POST", `/stations/${sid}/reviews`, { token, body: review })).body.error.code,
      "ALREADY_REVIEWED",
    );

    const other = (await api.login()).tokens["accessToken"];
    assert.equal(
      (await api.call("POST", `/stations/${sid}/reviews`, { token: other, body: { rating: 6 } }))
        .status,
      400,
    );
    assert.equal(
      (await api.call("POST", `/stations/${sid}/reviews`, { token: other, body: { rating: 3.5 } }))
        .status,
      400,
    );
    assert.equal(
      (await api.call("POST", "/stations/nope/reviews", { token: other, body: { rating: 3 } }))
        .status,
      404,
    );

    const list = await api.call("GET", `/stations/${sid}/reviews`);
    assert.ok(list.body.data.some((r: any) => r.userName === "Reviewer"));
  });
});

describe("route planner", () => {
  const bengaluru = { lat: 12.9716, lng: 77.5946 };
  const chennai = { lat: 13.0827, lng: 80.2707 };

  it("needs no stops for a short trip", async () => {
    const res = await api.call("POST", "/routes/plan", {
      body: {
        origin: bengaluru,
        destination: { lat: 13.1986, lng: 77.7066 },
        vehicle: { currentSocPercent: 90 },
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stopsNeeded, false);
    assert.equal(res.body.data.feasible, true);
    assert.ok(res.body.data.arrivalDestinationSocPercent > 50);
  });

  it("plans a feasible long trip with stops that stay on the corridor and within range", async () => {
    // 40 kWh at 7 km/kWh from 90% → ~224 km of usable range; Bengaluru→Chennai is ~363 road km
    const res = await api.call("POST", "/routes/plan", {
      body: {
        origin: bengaluru,
        destination: chennai,
        vehicle: { batteryKwh: 40, currentSocPercent: 90, efficiencyKmPerKwh: 7, maxChargeKw: 100 },
      },
    });
    assert.equal(res.status, 200);
    const plan = res.body.data;
    assert.ok(plan.estimatedRoadDistanceKm > plan.totalDistanceKm);
    assert.equal(plan.stopsNeeded, true);
    assert.equal(plan.feasible, true, JSON.stringify(plan.warnings));
    let lastKm = 0;
    for (const stop of plan.recommendedStops) {
      assert.ok(stop.distanceFromStartKm > lastKm, "stops must progress toward the destination");
      assert.ok(stop.offRouteKm <= 20);
      assert.ok(stop.estimatedArrivalSoc >= 10, `arrives with ${stop.estimatedArrivalSoc}%`);
      assert.ok(stop.targetChargeSoc <= 80 && stop.targetChargeSoc > stop.estimatedArrivalSoc);
      assert.ok(stop.chargeTimeMinutes > 0 && stop.estimatedCostInr > 0);
      lastKm = stop.distanceFromStartKm;
    }
    assert.ok(plan.arrivalDestinationSocPercent >= 10);
  });

  it("reports infeasible rather than inventing stops where the dataset has a coverage gap", async () => {
    // The dataset has no fast charger between ~22 km and ~173 km out of Bengaluru on this corridor.
    const res = await api.call("POST", "/routes/plan", {
      body: {
        origin: bengaluru,
        destination: chennai,
        vehicle: { batteryKwh: 30, currentSocPercent: 50, efficiencyKmPerKwh: 6 },
      },
    });
    const plan = res.body.data;
    assert.equal(plan.feasible, false);
    assert.ok(plan.warnings.length > 0);
    for (const stop of plan.recommendedStops) assert.ok(stop.distanceFromStartKm >= 15);
  });

  it("says so when the battery cannot reach any charger", async () => {
    const res = await api.call("POST", "/routes/plan", {
      body: { origin: bengaluru, destination: chennai, vehicle: { currentSocPercent: 10 } },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.feasible, false);
    assert.ok(res.body.data.warnings.length > 0);
  });

  it("validates input", async () => {
    assert.equal(
      (await api.call("POST", "/routes/plan", { body: { origin: bengaluru } })).status,
      400,
    );
    assert.equal(
      (
        await api.call("POST", "/routes/plan", {
          body: { origin: bengaluru, destination: chennai, vehicle: { currentSocPercent: 150 } },
        })
      ).status,
      400,
    );
  });
});

describe("rate limiting", () => {
  it("limits OTP requests per client", async () => {
    const app = createApp(testConfig({ otpSend: { windowMs: 60_000, max: 2 } }), { sms });
    const s = app.listen(0);
    await new Promise((r) => s.once("listening", r));
    const limited = client(`http://127.0.0.1:${(s.address() as AddressInfo).port}`);
    try {
      const codes: number[] = [];
      for (let i = 0; i < 3; i++)
        codes.push(
          (await limited.call("POST", "/auth/otp/send", { body: { phone: newPhone() } })).status,
        );
      assert.deepEqual(codes, [200, 200, 429]);
      const res = await limited.call("POST", "/auth/otp/send", { body: { phone: newPhone() } });
      assert.equal(res.body.error.code, "OTP_RATE_LIMITED");
      assert.ok(Number(res.headers.get("retry-after")) > 0);
    } finally {
      s.close();
    }
  });
});

describe("production safety", () => {
  it("refuses to start in production without real secrets", () => {
    assert.throws(() => loadConfig({ NODE_ENV: "production" }), /JWT_ACCESS_SECRET/);
    assert.throws(
      () =>
        loadConfig({
          NODE_ENV: "production",
          JWT_ACCESS_SECRET: "x".repeat(40),
          JWT_REFRESH_SECRET: "x".repeat(40),
        }),
      /different/,
    );
  });

  it("never exposes the OTP in production, even if ALLOW_DEMO_OTP is set", () => {
    const cfg = loadConfig({
      NODE_ENV: "production",
      JWT_ACCESS_SECRET: "a".repeat(40),
      JWT_REFRESH_SECRET: "b".repeat(40),
      ALLOW_DEMO_OTP: "true",
    });
    assert.equal(cfg.allowDemoOtp, false);
  });
});
