# India EV Finder – Mobile API

Base URL: `http://localhost:5000/api/v1` (dev) · machine-readable spec: [`openapi.json`](./openapi.json), also served at `GET /api/v1/openapi.json` (paste it into Swagger Editor or Postman).

```bash
npm run api:dev     # start (dev secrets are generated per run; OTPs print in this terminal)
npm run api:test    # 39 tests
```

## How login works

Phone number + SMS code. No passwords.

```
1. POST /auth/otp/send    { "phone": "+919876543210" }
2. POST /auth/otp/verify  { "phone": "+919876543210", "otp": "482913", "fullName": "Asha" }
   → { user, tokens: { accessToken, refreshToken, expiresIn: 900 }, isNewUser }
3. Every request:  Authorization: Bearer <accessToken>
4. On 401 TOKEN_EXPIRED:  POST /auth/refresh { refreshToken } → new { accessToken, refreshToken }, retry the request
5. Logout:  POST /auth/logout { refreshToken }
```

| Token | Lifetime | Notes |
|---|---|---|
| Access | 15 min | Stateless JWT. Revoked immediately on logout. |
| Refresh | 30 days | **Single use.** Every refresh returns a new one; always store it. |

Replaying an already-used refresh token ends that whole login (treated as theft), except for a 10-second grace window so a retry after a lost response on a bad network just works. The mobile client (`mobile/src/api/evApi.ts`) handles all of this, including sharing one refresh between concurrent requests.

**Rules enforced by the server:** code valid 5 min · 30 s between resends · 5 codes/hour/phone · 5 wrong guesses kill the code · OTP endpoints rate-limited per IP · no fixed or "demo" codes in production.

## Endpoints

🔒 = needs a valid access token. 🔓 = works anonymously; if a token is sent it must be valid (an expired one returns `TOKEN_EXPIRED` so the app refreshes rather than silently showing logged-out data).

| | Method & path | Purpose |
|---|---|---|
| | `POST /auth/otp/send` · `/auth/otp/verify` · `/auth/refresh` · `/auth/logout` | Login lifecycle |
| 🔒 | `GET` `PUT /user/profile` | Read / partially update profile |
| 🔒 | `DELETE /user/account` | Delete account + data (App Store / Play Store requirement) |
| 🔒 | `GET` `POST /user/vehicles` · `PUT` `DELETE /user/vehicles/:id` | Garage (max 10) |
| 🔒 | `GET /user/favorites` · `POST` `DELETE /user/favorites/:stationId` | Favorites |
| 🔓 | `GET /stations/nearby?lat&lng&radius_km&limit` | Nearest first, with `distanceKm` |
| 🔓 | `GET /stations/bounds?min_lat&min_lng&max_lat&max_lng` | Map viewport; `meta.truncated` says to zoom in |
| 🔓 | `GET /stations/search?q&city&lat&lng&limit&offset` | Text search, paginated |
| 🔓 | `GET /stations/:id` | Detail, ports, `recentReviews` |
| | `GET /stations/:id/reviews` | Paginated reviews |
| 🔒 | `POST /stations/:id/reviews` | One review per user per station |
| 🔒 | `POST /stations/:id/reserve` · `GET /bookings/my` · `DELETE /bookings/:id` | Reservations |
| 🔓 | `POST /routes/plan` | Charging stops for a trip |
| | `GET /health` · `GET /openapi.json` | Ops / docs |

Station list endpoints share filters: `connector`, `min_power_kw`, `network`, `status`.
Station ids can contain characters like `_` and `-`; URL-encode them in paths.

## Responses and errors

```jsonc
// success
{ "success": true, "data": ..., "meta": { "count": 10, "total": 240, "limit": 10, "offset": 0 } }

// failure: branch on error.code, never on the message
{ "success": false, "error": { "code": "SLOT_TAKEN", "message": "...", "details": [...] }, "requestId": "..." }
```

Quote `requestId` (also the `X-Request-Id` header) when reporting a bug.

| Code | HTTP | Meaning / what the app should do |
|---|---|---|
| `TOKEN_EXPIRED` | 401 | Refresh, then retry once |
| `UNAUTHENTICATED`, `INVALID_TOKEN` | 401 | Refresh if you hold a refresh token, else show login |
| `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_REUSED` | 401 | Session over → clear tokens, show login |
| `VALIDATION_ERROR` | 400 | `details[]` lists `{path, message}` per bad field |
| `OTP_INVALID` | 400 | Wrong or expired code |
| `OTP_COOLDOWN`, `OTP_LIMIT`, `OTP_RATE_LIMITED`, `RATE_LIMITED`, `OTP_ATTEMPTS_EXCEEDED` | 429 | Honour `Retry-After` / ask for a new code |
| `SLOT_TAKEN`, `BOOKING_LIMIT`, `STATION_OFFLINE`, `ALREADY_REVIEWED`, `VEHICLE_LIMIT`, `BOOKING_NOT_CANCELLABLE` | 409 | Show the message; state differs from what the user saw |
| `*_NOT_FOUND`, `NOT_FOUND` | 404 | |
| `SMS_FAILED` / `SMS_NOT_CONFIGURED` | 502 / 503 | SMS provider problem (see below) |

## Deploying for real users

1. **Set secrets.** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (different, ≥32 chars). With `NODE_ENV=production` the server refuses to start without them. See `.env.example`. The prototype's hard-coded fallback secrets were published in this repo's history, so anything signed with them is forgeable. Do not reuse them.
2. **Plug in an SMS provider.** In production OTP sending returns `SMS_NOT_CONFIGURED` until you pass one to `createApp(config, { sms })`: any object with `send(phone, message)`. For India, MSG91 or Twilio Verify are the usual choices (DLT template registration is required for Indian SMS).
3. **Serve over HTTPS** and set `TRUST_PROXY=1` behind a reverse proxy. The mobile client refuses non-HTTPS URLs in release builds.
4. **Move storage off process memory** (see limitations).

## Known limitations

- **Storage is in memory.** Users, sessions, bookings and reviews vanish on restart and cannot be shared by multiple instances. Rate limits and OTP state have the same constraint. The next step is a database (the project already uses MySQL) plus Redis or the DB for rate limiting/OTP.
- **Stations are static.** The API serves `src/data/stations.ts` (8,025 stations bundled at build time), not the live MySQL table the PHP endpoint reads. `status`, `freePorts` and `ports[]` are snapshot/derived values (`liveTelemetry: false`), not live charger data.
- **Reservations are not real bookings.** Nothing tells the charger operator; the API only prevents two app users double-booking a port.
- **Route planner is an estimate.** It uses straight-line distance × 1.25 and chargers within 20 km of that line, not turn-by-turn routing. The dataset has coverage gaps (e.g. nothing fast between ~22 km and ~173 km out of Bengaluru toward Chennai), and the planner returns `feasible: false` with a warning rather than inventing stops.
- Fixed-window rate limiting per IP; carrier-grade NAT can put many phones behind one IP, so the global limit is deliberately generous (600/min).
