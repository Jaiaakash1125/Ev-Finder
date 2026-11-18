# India EV Finder — Mobile App (Expo / React Native)

Cross-platform mobile app for **India EV Finder** built with Expo and React Native. It connects to the PHP REST API running on XAMPP (`india_ev_db` MySQL database with 8,025 EV charging stations across India) and mirrors the website's core pages: **Home**, **Map**, **Stations**, **Connectors**, and **Station Detail**.

---

## Prerequisites

- **Node.js** (v18 or newer) and **npm**
- **XAMPP** (Apache + MySQL) with `india_ev_db` imported and the PHP REST API deployed at `http://<PC-IP>/api/v1`
- **Expo Go** installed on your Android or iOS phone (connected to the **same Wi-Fi network** as your PC)

---

## 1. Set Up XAMPP & Verify the API

1. Open **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Confirm the `india_ev_db` database is imported in MySQL (containing `ev_stations` with 8,025 stations and `ev_reviews`).
3. Verify the PHP REST API responds in your browser on the PC:
   ```text
   http://localhost/api/v1/health
   ```
   You should see JSON with `"status": "ok"` and `"stations": 8025`.

---

## 2. Find Your PC's IPv4 Address & Configure `EXPO_PUBLIC_API_URL`

Real phones running Expo Go cannot reach `localhost` on your PC — they must use your PC's local Wi-Fi IPv4 address.

1. Open Command Prompt or PowerShell on your PC and run:
   ```powershell
   ipconfig
   ```
2. Under your active network adapter (usually **Wireless LAN adapter Wi-Fi**), copy the **IPv4 Address** (for example, `192.168.1.10`).
3. In the `mobile/` folder, copy `.env.example` to `.env`:
   ```powershell
   cd mobile
   Copy-Item .env.example .env
   ```
4. Edit `mobile/.env` and set `EXPO_PUBLIC_API_URL` to your PC's IPv4 address:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.10/api/v1
   ```
   *(Replace `192.168.1.10` with the IPv4 address from `ipconfig`. Do not commit `.env`.)*

---

## 3. Allow Apache Through Windows Firewall

If your phone shows **"Can't reach server"** even though `http://localhost/api/v1/health` works on your PC, Windows Firewall is likely blocking incoming port 80 connections from your phone.

### Option A: Using Windows Defender Firewall UI
1. Open **Windows Defender Firewall with Advanced Security** (search for it in the Start menu).
2. Click **Inbound Rules** → **New Rule...**
3. Choose **Port** → **Next** → select **TCP** and enter **Specific local ports: `80`** → **Next**.
4. Choose **Allow the connection** → **Next**.
5. Keep **Private** checked (uncheck Public if you only test on trusted home/office Wi-Fi) → **Next**.
6. Name the rule `XAMPP Apache HTTP (Port 80)` and click **Finish**.

### Option B: Using PowerShell (Run as Administrator)
```powershell
New-NetFirewallRule -DisplayName "XAMPP Apache HTTP (Port 80)" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Private
```

To test from your phone's browser before launching the app, open:
```text
http://<YOUR-PC-IPV4>/api/v1/health
```

---

## 4. Install Dependencies & Run the App

In PowerShell or terminal:

```powershell
cd mobile
npm install
npx expo start
```

> **Windows PowerShell note:** If PowerShell blocks `.ps1` scripts (`running scripts is disabled on this system`), use `npm.cmd` and `npx.cmd`:
> ```powershell
> npm.cmd install
> npx.cmd expo start
> ```

After changing `mobile/.env`, restart Metro with a clean cache so Expo picks up the updated `EXPO_PUBLIC_API_URL`:
```powershell
npx expo start -c
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS), or press `a` (Android emulator), `i` (iOS simulator), or `w` (web).

---

## App Screens & Architecture

- **Home**: Hero search box (submits to Stations), live station count from `GET /health`, **Stations near you** horizontal list (`GET /stations/nearby`), and **Explore by Indian City** grid.
- **Map**: Interactive Leaflet map centered on your GPS location (or Bengaluru if location is denied), viewport marker loading via `GET /stations/bounds` (debounced 600 ms, capped at 500 markers), search via `GET /stations/search` (debounced 400 ms), API-backed filters, and station bottom sheet with **View Details**.
- **Stations**: Infinite-scroll `FlatList` (`GET /stations?page=N&limit=20`), debounced search (`q`), searchable city picker (`GET /stations/cities`), connector/power/status/network filters, pull-to-refresh, **Near me** distance sorting, and AsyncStorage offline caching (`"Offline - saved data"`).
- **Station Detail**: Full station specs (`GET /stations/{id}`), embedded map preview, cross-platform **Get Directions** (`geo:` on Android, `maps.apple.com` on iOS), native **Share**, and community reviews (`GET` & `POST /stations/{id}/reviews`). Port availability, tariff, status, and baseline rating are clearly marked as demo values.
- **Connectors**: Visual guide to India's 6 EV plug standards (CCS2, Type 2 AC, GB/T / Bharat DC-001, LECCS, CHAdeMO, 15A Socket) with local images, search, category filters, full pinout specs, and one-tap **Find Stations**.

---

## Type Checking

Run TypeScript validation in `mobile/`:

```powershell
npx tsc --noEmit
```
