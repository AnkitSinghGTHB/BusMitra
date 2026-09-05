# AGENTS.md — BusMitra Project Intelligence Brief

> **Purpose:** This file gives any AI agent, developer, or collaborator a complete mental model of the BusMitra project. Read this first before touching any code.

---

## 🎯 What Is BusMitra?

BusMitra is a **real-time public bus tracking system designed for Tier-2 and Tier-3 Indian cities** where:
- Municipal corporations cannot afford GPS hardware (₹5,000–₹10,000/bus)
- 40%+ of commuters used ₹500 feature phones (no smartphones, no apps)
- Internet connectivity is unreliable (2G/EDGE networks dominate)
- Bus drivers are contractual, undertrained, and won't cooperate with complex apps

**The core innovation:** Track buses using the driver's existing smartphone browser (zero hardware), fall back to passenger crowdsourcing, then fall back to static timetables — and be transparent about uncertainty at every step.

---

## 🏗️ Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIPLE-FALLBACK ENGINE                        │
│                                                                  │
│  PRIMARY: Driver's phone (Browser Geolocation API)              │
│     ↓ (fails after 60s of no GPS)                               │
│  SECONDARY: Passenger check-ins ("I'm on this bus" button)      │
│     ↓ (fails if no check-ins)                                   │
│  TERTIARY: GTFS static timetable (bundled JSON)                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND: Node.js + Express + Socket.io                         │
│  CACHE: In-memory Map (Redis in production)                     │
│  DATA: JSON seed files (PostgreSQL in production)               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Passenger│   │ Feature  │   │  Admin   │
    │   PWA    │   │  Phone   │   │Dashboard │
    │ (React + │   │ (SMS +   │   │ (React)  │
    │ Leaflet) │   │  IVR)    │   │          │
    └──────────┘   └──────────┘   └──────────┘
```

---

## 📁 Project Structure

```
BusMitra/
├── backend/
│   └── src/
│       ├── server.js              # Express + Socket.io entry point
│       ├── api/
│       │   ├── start.js           # POST /start — create trip session
│       │   ├── location.js        # POST /location — driver GPS update
│       │   ├── checkin.js         # POST /checkin — passenger consensus
│       │   ├── buses.js           # GET /buses — all active buses
│       │   ├── eta.js             # GET /eta/:busId — ETA calculation
│       │   └── smsWebhook.js      # POST /sms-webhook — SMS gateway mock
│       ├── services/
│       │   ├── busCache.js        # In-memory bus store (Map)
│       │   ├── consensus.js       # 3-user check-in validation
│       │   └── etaCalculator.js   # Distance/speed + delay points
│       └── utils/
│           ├── fallbackTimer.js   # Stale bus detection (60s → offline)
│           └── haversine.js       # Distance calculation
├── frontend/
│   └── src/
│       ├── App.jsx                # Main passenger PWA
│       ├── components/
│       │   ├── Map.jsx            # Leaflet map with bus markers
│       │   ├── ETABox.jsx         # ETA range + confidence + freshness
│       │   ├── StatusBadge.jsx    # Live (green) / Scheduled (grey)
│       │   ├── SMSMock.jsx        # Feature-phone modal
│       │   ├── CheckinButton.jsx  # "I'm on this bus"
│       │   └── HindiToggle.jsx    # EN/HI/PA language switcher
│       ├── hooks/
│       │   ├── useSocket.js       # Socket.io with polling fallback
│       │   └── useBusData.js      # Bus data fetching
│       └── i18n/
│           ├── en.json            # English
│           ├── hi.json            # Hindi
│           └── pa.json            # Punjabi
├── simulator/
│   └── index.js                   # Fake GPS sender for demo
├── data/
│   ├── routes.json                # Route polylines
│   ├── stops.json                 # Stop coordinates (Moga)
│   └── gtfs.json                  # Schedule fallback data
└── docs/
    ├── SCOPE.md                   # Full project scope & competitive analysis
    ├── FINAL_SYSTEM_ARCHITECTURE.md
    ├── CORE_APPLICATION_ARCHITECTURE.md
    ├── DATABASE_ARCHITECTURE.md
    ├── FILE_STRUCTURE.md
    ├── MODULES_FEATURES_FUNCTIONS.md
    ├── NONTECHNICAL_WORKFLOW.md
    └── UI_UX.md
```

---

## 🔑 Key Concepts Every Agent Must Understand

### 1. Triple-Fallback Engine
The system NEVER shows a blank screen. It degrades honestly:
| Level | Source | Confidence | Marker Color | Banner |
|-------|--------|-----------|--------------|--------|
| PRIMARY | Driver GPS (live) | 80-100% | 🟢 Green | "Live" |
| SECONDARY | Passenger consensus | 50-70% | 🟡 Yellow | "Crowd-Restored" |
| TERTIARY | GTFS schedule | 30-40% | ⚪ Grey | "Scheduled (timetable)" |

### 2. Confidence Score
NOT hardcoded. Calculated from:
- **Data source** (GPS=100, Consensus=-20, GTFS=-50)
- **Freshness** (exponential decay after 60s)
- **Speed variance** (erratic = less confident)
- **Time of day** (rush hour = less predictable)

### 3. ETA Calculation
- Uses **route polyline distance** (not straight-line Haversine)
- Adds **known delay points** (railway crossings, driver break spots)
- Returns a **range** (min-max) not a single number
- Formula: `baseETA = routeDistance / historicalSpeed`, `maxETA = baseETA + delays + 30% buffer`

### 4. Consensus Engine
When driver GPS fails, passengers can restore tracking:
- Passenger clicks "I'm on this bus" → sends GPS + userId
- Backend needs N unique check-ins within 200m (N varies by time/ridership)
- Anti-spoof: 1 check-in per user per 30-second window
- Passive check-in: auto-detect if passenger GPS is on route + at bus speed

### 5. Feature Phone Access
- **SMS:** User texts "BUS M1" to a number → auto-reply with ETA
- **IVR:** User gives missed call → auto-callback with voice ETA in Hindi/Punjabi
- Both are mocked in hackathon demo but backend API is real

---

## ⚠️ Known Limitations & Honest Answers

| Limitation | Honest Answer for Judges |
|-----------|-------------------------|
| **Browser tab gets killed** | Wake Lock API + persistent notification. Fallback engine detects stale data in 60s. |
| **Consensus cold-start** | Threshold drops to 1 check-in at low-ridership hours. Passive auto-check-in planned. |
| **ETA accuracy** | We show ranges with confidence, not false precision. Delay points added for known bottlenecks. |
| **Feature phone = mock** | Backend SMS webhook is real and testable via curl. Twilio integration is production-ready. |
| **Driver won't use it** | Auto-start from localStorage. PWA on home screen = one tap. Non-monetary gamification. |
| **Free tier limits** | Keep-alive ping prevents cold start. Localhost backup for demo. |

---

## 🧪 Demo Script (5-7 Minutes)

```
0:00 - Problem slide (30s): "Grandmother waiting in sun in Moga"
0:30 - Solution overview (30s): "Zero hardware, triple fallback"
1:00 - LIVE DEMO START: Open passenger PWA, show empty map
1:15 - Start simulator → bus appears on map, starts moving (WOW moment)
1:30 - Show ETA box updating: "8-13 min | 92% confidence | Live"
2:00 - PAUSE simulator → show fallback: marker turns grey, "Scheduled"
2:30 - RESUME → bus comes back live (resilience proven)
3:00 - Show SMS mock → click "Get SMS Alert" → Nokia modal
3:15 - Show curl command hitting /sms-webhook → real response
3:30 - Switch language to Hindi → entire UI translates
4:00 - Show driver dashboard (separate tab)
4:30 - Architecture slide (30s)
5:00 - Revenue model + scalability (30s)
5:30 - Q&A
```

---

## 🛠️ Tech Stack (Hackathon MVP)

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite + Tailwind | Fast build, hot reload, utility CSS |
| Map | Leaflet + OpenStreetMap | Free, no API key, works offline |
| Backend | Node.js + Express | Same language as frontend, fast setup |
| Real-Time | Socket.io | WebSocket with polling fallback built-in |
| Cache | In-memory Map() | No external dependency for hackathon |
| Data | JSON files | No database setup needed |
| Deployment | Vercel (frontend) + Render (backend) | Free tier, HTTPS, auto-deploy |

### NOT Used in MVP (Saved for Production)
- ❌ PostgreSQL + PostGIS → JSON files instead
- ❌ Redis → In-memory Map instead
- ❌ Service Workers → Foreground tracking only
- ❌ Twilio → Backend webhook ready, SMS mocked in UI

---

## 🏆 Competition Context

**Event:** Smart VIT Hackathon 2026
**Problem:** SVH26003 — Real-Time Public Transport Tracking for Small Cities
**Team:** SVH-10124 (DayZero)
**Coding Window:** ~10-12 hours

### Why We Win vs. Other Teams:
1. **Zero hardware** — every other team will suggest GPS devices or IoT nodes
2. **Feature phone inclusive** — nobody else will even think about SMS/IVR
3. **Honest ETA** — confidence scores + freshness timers instead of fake precision
4. **Triple fallback** — graceful degradation that actually works on stage
5. **Instant demo** — QR code for judges to try on their own phones

---

## 📋 API Contract

| Method | Endpoint | Purpose | Response |
|--------|----------|---------|----------|
| POST | /start | Start driver trip | `{ sessionId, status }` |
| POST | /location | Update bus GPS | `{ success: true }` |
| POST | /checkin | Passenger check-in | `{ accepted, consensusCount }` |
| GET | /buses | All active buses | `[{ busId, lat, lng, status, speed }]` |
| GET | /eta/:busId | Get ETA for bus | `{ min, max, confidence, source }` |
| POST | /sms-webhook | SMS gateway mock | `{ reply: "Bus M1 arriving..." }` |
| GET | /health | Server health check | `{ status: "ok", uptime }` |

---

## 🎯 Success Criteria

- [ ] Bus marker moves smoothly on map (Socket.io working)
- [ ] ETA box shows range + confidence + freshness (not hardcoded)
- [ ] Pausing simulator → marker turns grey + "Scheduled" (fallback works)
- [ ] Resuming simulator → marker turns green + "Live" (recovery works)
- [ ] SMS mock opens and shows Nokia-style response
- [ ] curl to /sms-webhook returns real ETA response
- [ ] Hindi toggle translates all UI text
- [ ] PWA installable on judge's phone (manifest.json works)
- [ ] No blank screens, no infinite spinners, no crashes
