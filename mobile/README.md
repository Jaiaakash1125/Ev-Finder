# 📱 India EV Finder - Mobile App (iOS & Android)

Cross-platform mobile companion app for India EV Finder built with **React Native (Expo)**, matching the website's dark cyber-electric aesthetic, interactive maps, route corridor planning, and vehicle garage.

---

## 🚀 Quick Start Guide

### 1. Start the Authenticated Backend REST API
In the root directory of the repository:
```bash
npm run api:dev
```
The API server will listen on `http://localhost:5000/api/v1` with 980+ live EV stations.

---

### 2. Run the Mobile App

Navigate to the `mobile/` directory:
```bash
cd mobile
npm install
npx expo start
```

### 3. Test on Physical Devices & Emulators
- **Real Phone (iOS / Android):** Install the **Expo Go** app from the App Store or Google Play Store. Scan the QR code printed in your terminal.
- **Android Emulator:** Press `a` in terminal.
- **iOS Simulator:** Press `i` in terminal.
- **Web Preview:** Press `w` in terminal.

---

## 🎨 Design System & Features
- **Cyber Midnight Dark Palette:** `#080c14` canvas, `#38bdf8` electric blue, `#00f2fe` neon cyan accents, frosted glass cards.
- **Interactive Map & Station Discovery:** Native Google Maps with color-coded live availability badges (Available vs Busy).
- **Station Detail Bottom Sheet Drawer:** Fast DC speeds, port counters, connector pills, amenities, and 1-tap Google Maps directions.
- **Highway EV Corridor Planner:** Enter origin, destination, and vehicle battery level to get planned highway fast-charging stops.
- **EV Garage & Favorites:** Register multiple EV models (Nexon EV, Ather, Ola, MG) and bookmark charging hubs.
- **Phone OTP Authentication:** Seamless SMS code verification.
