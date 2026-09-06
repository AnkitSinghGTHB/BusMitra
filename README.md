# 🚌 BusMitra (बस मित्र)
(we lost btw)
> **Zero-Hardware Real-Time Public Transit Tracking & Fleet Intelligence for Tier-2 and Tier-3 Indian Cities.**

[![Smart VIT Hackathon 2026](https://img.shields.io/badge/Hackathon-Smart_VIT_2026-blue.svg)](https://vit.ac.in)
[![Problem Statement](https://img.shields.io/badge/Problem-SVH26003-orange.svg)](#-the-problem-in-small-cities)
[![Frontend](https://img.shields.io/badge/Frontend-React_19_+_Vite_+_Tailwind-61dafb.svg)](frontend/)
[![Backend](https://img.shields.io/badge/Backend-Node.js_+_Socket.io-339933.svg)](backend/)
[![Maps](https://img.shields.io/badge/Maps-Leaflet_+_OpenStreetMap-199900.svg)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📌 Executive Summary

Public transit tracking apps like Google Maps and Chalo work well in Tier-1 metros (Delhi, Mumbai, Bengaluru). But in **Tier-2 and Tier-3 Indian cities** (like Moga, Bikaner, Bhopal), public bus tracking is completely broken:
- Municipal corporations have tight annual budgets (₹10–15 Lakhs) and **cannot afford dedicated GPS hardware** (₹6,000–₹10,000 per bus).
- Over **40% of commuters rely on ₹500 basic keypad phones** without 4G or app stores.
- Contractual drivers refuse to install heavy or intrusive native apps.
- Spotty 2G/EDGE network causes standard tracking apps to crash or freeze.

**BusMitra solves this with ZERO proprietary hardware:**
1. **Driver's Phone = GPS Beacon:** The driver opens a lightweight web link in Chrome/Safari; coordinates stream live over WebSockets using HTML5 Geolocation + Wake Lock API.
2. **Triple-Fallback Engine:** When driver GPS fails, passenger crowdsourcing takes over; if nobody is on board, it gracefully falls back to static timetable schedules. The commuter **never sees a blank screen**.
3. **100% Inclusivity:** Commuters with keypad phones can query live ETAs via **SMS & automated IVR missed calls**.
4. **Offline PWA:** Map tiles and 13 full route corridors are precached in the browser for instant offline navigation.

---

## 🏗️ The Triple-Fallback Engine

Traditional bus tracking systems fail silently when internet cuts out or a driver's battery dies. BusMitra degrades and recovers transparently:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRIPLE-FALLBACK ENGINE                          │
│                                                                        │
│  🟢 LEVEL 1: PRIMARY (Driver Smartphone Browser GPS)                   │
│     └─ Live tracking | 80–100% confidence | Updates every 3 seconds    │
│        ↓ (Triggered after 60s of silence)                              │
│  🟡 LEVEL 2: SECONDARY (Passenger Consensus)                           │
│     └─ "I'm on this bus" crowdsourcing | 3 users within 200m quorum    │
│        ↓ (Triggered if no active check-ins)                            │
│  ⚪ LEVEL 3: TERTIARY (GTFS Timetable Schedule)                         │
│     └─ Displays static schedule arrival | Transparently marked "Grey"  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. 📱 Zero-Hardware Driver Portal
- **Zero App Installs:** Drivers bookmark a web URL. One tap starts or stops broadcasting.
- **Battery Efficient:** Dark, minimalist UI without heavy map rendering; consumes ~9% battery over a 4-hour shift.
- **Wake Lock & Auto-Resume:** Uses the Screen Wake Lock API to prevent the tab from sleeping; stores trip state in `localStorage` to automatically resume after accidental browser restarts.
- **Non-Monetary Gamification:** Monthly Punctuality Leaderboard for drivers, offering social and professional recognition at municipal depots.

### 2. ⏱️ Honest ETA & Confidence Engine
- **Road Polyline Snapping:** Distance is measured along the actual road geometry from OpenStreetMap (OSRM), not straight-line crow-flies Euclidean distance.
- **Chokepoint & Bottleneck Awareness:** Factored into arrival times are known railway crossings (*phataks*), bazaar congestion, and scheduled driver tea halts.
- **Transparent Uncertainty:** Shows realistic ranges (e.g. `8–13 mins`) paired with a dynamic **Confidence Score (0–100%)** rather than misleading single numbers.

### 3. 📟 100% Inclusivity (Keypad Phone SMS & IVR)
- **SMS Gateway Mock & Real Webhook (`/api/sms-webhook`):** A commuter texts `BUS MP-01` to get an instant SMS reply with next-stop ETA.
- **Interactive Voice Response (IVR):** Missed call callback providing voice ETA in regional languages (Hindi & Punjabi).

### 4. 🌐 Offline-First PWA & Multilingual Support
- **Full Offline Routing:** All route geometry (8,000+ points) and stops are bundled in the frontend JS bundle. OpenStreetMap tiles are cached locally via Workbox Service Worker (`CacheFirst`, 500 tiles, 30 days).
- **Multilingual:** Seamless 1-tap switching between **English**, **Hindi (हिन्दी)**, and **Punjabi (ਪੰਜਾਬੀ)**.
- **Multimodal Trip Planner:** If there is no direct bus between Point A and Point B, computes a combined journey: *Walk to Stop → Bus Corridor → Walk to Destination*.

### 5. 🗺️ Open Data & GTFS-Realtime Integration
- Generates standard **GTFS-Realtime v2.0 feeds**:
  - `/api/gtfs-rt/vehicle-positions` — Real-time vehicle coordinates & occupancy
  - `/api/gtfs-rt/trip-updates` — Stop-level delays and arrival predictions
  - `/api/gtfs-rt/alerts` — Service advisories and road disruption notices
- Allows any municipality deploying BusMitra to appear directly on **Google Maps** and **Apple Maps** overnight.

---

## 🗺️ Corridors Mapped in MVP

BusMitra comes pre-loaded with **13 real transit corridors across 7 Indian states** with over **8,000 real road polyline points**:

| Code | Corridor / Route | State | Key Stops |
|---|---|---|---|
| **MP-01** | Indore ⇄ Bhopal | Madhya Pradesh | Indore ISBT, Dewas, Ashta, Sehore, Bhopal Nadra |
| **M1** | Moga Bus Stand ⇄ Dagru | Punjab | Moga Bus Stand, GT Road, Landeke, Dagru Phatak |
| **M2** | Moga ⇄ Baghapurana | Punjab | Moga Stand, Singhanwala, Rode, Baghapurana |
| **RJ-01** | Bikaner ⇄ Deshnoke | Rajasthan | Bikaner Junction, Karni Nagar, Deshnoke Temple |
| **RJ-02** | Bikaner ⇄ Nokha | Rajasthan | Bikaner Central, Gangashahar, Nokha Mandi |
| **UP-01** | Lucknow ⇄ Kanpur | Uttar Pradesh | Charbagh, Unnao Bypass, Jajmau, Kanpur Central |
| **MH-01** | Pune ⇄ Shirur | Maharashtra | Shivajinagar, Wagholi, Shikrapur, Shirur |
| **KA-01** | Hubballi ⇄ Dharwad | Karnataka | Hubballi CBT, Unkal Lake, Navanagar, Dharwad BRTS |
| **BR-01** | Patna ⇄ Hajipur | Bihar | Patna Junction, Gandhi Setu, Hajipur Station |
| **AS-01** | Guwahati ⇄ Dispur | Assam | Paltan Bazar, GS Road, Ganeshguri, Dispur Secretariat |
| **VIT-01** | Bhopal Junction ⇄ VIT Bhopal | Madhya Pradesh | Bhopal Railway Stn, Sehore Bypass, Ashta, Kothri Kalan (VIT) |
| **VIT-02** | Indore Airport ⇄ VIT Bhopal | Madhya Pradesh | Devi Ahilyabai Holkar Airport, Dewas, Ashta, VIT Campus |
| **VIT-03** | Ashta Stand ⇄ VIT Main Gate | Madhya Pradesh | Ashta Old Bus Stand, Kannod Road, Kothri Kalan, VIT Gate |

---

## 🏛️ System Architecture

```
                                  [ Driver Phone Browser ]
                                             │ (HTML5 Geolocation + WakeLock)
                                             │ WebSocket (lat, lng, speed)
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BUSMITRA BACKEND                                       │
│                                (Node.js + Express)                                     │
│                                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────┐   ┌───────────────────────────┐   │
│   │   In-Memory Cache   │   │ Fallback Coordinator │   │   Consensus Engine        │   │
│   │ (Live Bus Positions)│   │ (60s Silence Detector│   │ (3-User / 200m Quorum)    │   │
│   └──────────┬──────────┘   └──────────┬───────────┘   └─────────────┬─────────────┘   │
│              │                         │                             │                 │
│              └─────────────────────────┼─────────────────────────────┘                 │
│                                        ▼                                               │
│                        ┌──────────────────────────────┐                                │
│                        │   ETA & Confidence Engine    │                                │
│                        │ (Polyline Snap + Chokepoints)│                                │
│                        └──────────────┬───────────────┘                                │
└───────────────────────────────────────┼────────────────────────────────────────────────┘
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
       [ Passenger PWA ]        [ SMS / IVR Gateway ]   [ GTFS-RT Feeds ]
     (React 19 + Leaflet)      (Nokia Mock / Webhook)  (Google Maps Format)
```

---

## 📁 Repository Structure

```
BusMitra/
├── backend/                    # Node.js + Express API & WebSocket Server
│   └── src/
│       ├── server.js           # Server entry point (Port 3000)
│       ├── api/                # Endpoints: /buses, /eta, /start, /location, /sms-webhook, /gtfs-rt
│       ├── services/           # busCache.js, consensus.js, etaCalculator.js, simulator.js
│       └── utils/              # fallbackTimer.js, haversine.js, polyline.js
├── frontend/                   # React 19 + Vite + Tailwind CSS PWA
│   └── src/
│       ├── App.jsx             # Main router and state layout
│       ├── pages/              # PassengerHome, LiveMapPage, DriverPortal, AdminDashboard, Multimodal
│       ├── components/         # MapView, ETABox, SMSMock, ConsensusButton, LanguageToggle
│       ├── hooks/              # useSocket.js, useBusData.js, useTripPlanner.js
│       ├── data/               # Offline bundled routes & stop coordinates
│       └── i18n/               # Localization strings (en.json, hi.json, pa.json)
├── simulator/                  # Standalone Virtual Bus GPS Streamer
│   └── index.js                # Emulates live driver GPS telemetry over real road polylines
├── data/                       # Ground-truth transit data
│   ├── routes.json             # 13 high-resolution road polylines (8,000+ points)
│   ├── stops.json              # Stop coordinates and metadata
│   ├── delays.json             # Known delay bottlenecks (railway phataks, bazaars)
│   └── gtfs.json               # Static schedule timetable fallback
└── docs/                       # Architectural specs & competition guides
    ├── SCOPE.md
    ├── FINAL_SYSTEM_ARCHITECTURE.md
    └── UI_UX.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (bundled with Node.js)

### Step 1: Clone the Repository
```bash
git clone https://github.com/AnkitSinghGTHB/BusMitra.git
cd BusMitra
```

### Step 2: Start the Backend Server
```bash
cd backend
npm install
npm start
```
*Backend runs on `http://localhost:3000` (WebSocket on port 3000).*

### Step 3: Start the Frontend PWA
*In a new terminal window:*
```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```
*Frontend opens at `http://127.0.0.1:5174`.*

### Step 4: Start the Fleet Simulator (Optional for Testing)
*In a new terminal window:*
```bash
cd simulator
node index.js
```
*Spawns virtual buses that stream real-time GPS telemetry across the routes.*

---

## 🔌 Core API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/buses` | Get all currently active buses with positions, speed, and status |
| `GET` | `/api/eta/:busId` | Get live ETA range, confidence score, and data source for a bus |
| `POST` | `/api/start` | Start a new driver trip session (`{ routeId, driverId }`) |
| `POST` | `/api/location` | Ingest driver GPS coordinates (`{ sessionId, lat, lng, speed }`) |
| `POST` | `/api/checkin` | Submit a crowdsourced passenger check-in (`{ busId, lat, lng, userId }`) |
| `POST` | `/api/sms-webhook` | Inbound SMS parser for feature phones (`{ from, body: "BUS MP-01" }`) |
| `GET` | `/api/gtfs-rt/vehicle-positions` | GTFS-RT v2.0 live vehicle positions feed |
| `GET` | `/api/gtfs-rt/trip-updates` | GTFS-RT v2.0 stop arrival delays and trip updates |
| `GET` | `/api/health` | Server uptime and active socket connection count |

---

## 🥊 Competitive Advantage

| Feature | Google Maps | Chalo | Hardware GPS Units | **BusMitra** |
|---|:---:|:---:|:---:|:---:|
| **Hardware Cost** | N/A | High (₹5,000–10,000/bus) | High (₹6,000–8,000/bus) | **₹0 (Driver's phone)** |
| **Tier-2 & Tier-3 Focus** | ❌ Metros only | ❌ ~20 Tier-1 cities | ❌ Expensive TCO | **✅ Purpose-built for small towns** |
| **Keypad Phone Access** | ❌ Smartphone only | ❌ Smartphone only | ❌ Backend only | **✅ SMS & IVR Missed Call** |
| **Fault Tolerance** | ❌ Blank / Missing | ❌ Stale freeze | ❌ Silent device death | **✅ Triple-Fallback Engine** |
| **Offline Navigation** | ⚠️ Partial | ❌ Fails without 4G | ❌ | **✅ Precached PWA + Bundled Routes** |
| **Open Data (GTFS-RT)** | ❌ Proprietary | ❌ Walled garden | ❌ Proprietary | **✅ Standard GTFS-RT v2.0** |
| **Deployment Time** | Months (Municipal deals) | Weeks | Months (Wiring & installation) | **< 30 Minutes (Paper QR Code)** |

---

## 👥 Team DayZero

* **Event:** Smart VIT Hackathon 2026
* **Team ID:** SVH-10124
* **Problem Statement:** SVH26003 — Real-Time Public Transport Tracking for Small Cities

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
