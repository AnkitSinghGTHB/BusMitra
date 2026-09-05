# BusMitra – Final System Architecture

## Complete System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              BUSMITRA – SYSTEM ARCHITECTURE                             │
│                            "Predictability Without Peripherals"                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          LAYER 1: INGESTION (Triple-Fallback)                     │  │
│  ├───────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                   │  │
│  │   PRIMARY (Driver PWA – Browser Geolocation API)                                 │  │
│  │   ┌───────────────────────────────────────────────────────────────────────────┐  │  │
│  │   │  • QR code auto-start (one-time scan, saved in localStorage)            │  │  │
│  │   │  • Sends POST /location every 5 seconds                                 │  │  │
│  │   │  • Accelerometer + cell-tower auto-detect (no manual start needed)      │  │  │
│  │   │  • Gamification: Punctuality leaderboard (₹500 monthly bonuses)         │  │  │
│  │   └───────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                          │                                        │  │
│  │                                          ▼ (If no GPS for 60 seconds)             │  │
│  │   SECONDARY (Passenger Relay – PWA Check-in)                                     │  │
│  │   ┌───────────────────────────────────────────────────────────────────────────┐  │  │
│  │   │  • "I'm on this bus" button on passenger PWA                            │  │  │
│  │   │  • 3-user consensus within 200 meters (Haversine validation)            │  │  │
│  │   │  • Sends POST /checkin with lat/lng + user ID                          │  │  │
│  │   │  • Anti-spoof: Each user can check-in only once per 30-second window   │  │  │
│  │   └───────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                          │                                        │  │
│  │                                          ▼ (If no check-ins)                     │  │
│  │   TERTIARY (GTFS Offline – Pre-loaded Schedule)                                  │  │
│  │   ┌───────────────────────────────────────────────────────────────────────────┐  │  │
│  │   │  • Bundled JSON in PWA (IndexedDB – installed on first load)            │  │  │
│  │   │  • Displays "Scheduled: 18-22 min | 40% Confidence (GTFS Schedule)"     │  │  │
│  │   │  • Warning banner: "⚠️ Live signal lost. Showing scheduled timetable."  │  │  │
│  │   └───────────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                              │
│                                          ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         LAYER 2: BACKEND & FUSION ENGINE                          │  │
│  ├───────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                   │  │
│  │   ┌─────────────────────────────────────────────────────────────────────────────┐│  │
│  │   │  API GATEWAY (Node.js + Express) – Port 3000                               ││  │
│  │   ├─────────────────────────────────────────────────────────────────────────────┤│  │
│  │   │  POST /start    → Creates trip session, returns session ID                ││  │
│  │   │  POST /location → Updates bus position in Redis cache (TTL: 60s)          ││  │
│  │   │  POST /checkin  → Consensus engine validation (3-user rule)              ││  │
│  │   │  GET /buses     → Returns all active buses (live + scheduled status)      ││  │
│  │   │  GET /eta/:id   → Distance/Speed ETA + confidence score                  ││  │
│  │   │  GET /leaderboard → Returns driver rankings (punctuality)                ││  │
│  │   └─────────────────────────────────────────────────────────────────────────────┘│  │
│  │                                          │                                        │  │
│  │   ┌──────────────────────────────────────┴──────────────────────────────────────┐│  │
│  │   │  REAL-TIME BROKER (Socket.io + Redis – Port 6379)                          ││  │
│  │   ├─────────────────────────────────────────────────────────────────────────────┤│  │
│  │   │  • io.emit('bus_update') → pushes location to all connected clients       ││  │
│  │   │  • io.emit('status_change') → pushes Live → Scheduled transitions         ││  │
│  │   │  • Redis: Stores bus positions with 60s TTL (auto-expire stale buses)     ││  │
│  │   │  • Redis: Stores check-ins with 30s TTL (consensus window)                ││  │
│  │   │  • Socket.io rooms: Separate channels per route (efficient broadcasting)  ││  │
│  │   └─────────────────────────────────────────────────────────────────────────────┘│  │
│  │                                          │                                        │  │
│  │   ┌──────────────────────────────────────┴──────────────────────────────────────┐│  │
│  │   │  DATA PERSISTENCE (PostgreSQL + PostGIS – Port 5432)                       ││  │
│  │   ├─────────────────────────────────────────────────────────────────────────────┤│  │
│  │   │  • Trip sessions (permanent – for analytics and driver scores)            ││  │
│  │   │  • Driver scores (leaderboard persistence)                                ││  │
│  │   │  • Historical speeds (ETA baseline by route + time-of-day)                ││  │
│  │   │  • GTFS schedule data (route/stop geometry)                               ││  │
│  │   │  • PostGIS spatial index for nearest-stop queries (GIST)                  ││  │
│  │   └─────────────────────────────────────────────────────────────────────────────┘│  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                          │                                              │
│                                          ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐  │
│  │                          LAYER 3: DISTRIBUTION                                    │  │
│  ├───────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                   │  │
│  │   CHANNEL A: Smartphone (PWA – React + Vite + Leaflet)                           │  │
│  │   ┌───────────────────────────────────────────────────────────────────────────┐  │  │
│  │   │  • Live map: OpenStreetMap tiles (₹0 API cost)                          │  │  │
│  │   │  • Bus marker: Animated, color-coded (Green/Yellow/Grey)                │  │  │
│  │   │  • ETA Box: "8-13 min | 92% Confidence | Live"                         │  │  │
│  │   │  • Freshness Timer: "Location updated 12s ago"                         │  │  │
│  │   │  • "Follow Bus" toggle: Auto-centers map on bus                        │  │  │
│  │   │  • Language toggle: English / Hindi / Punjabi                          │  │  │
│  │   │  • "Get SMS Alert" button → Feature-phone modal popup                  │  │  │
│  │   │  • "I'm on this bus" button → Passenger relay check-in                 │  │  │
│  │   │  • PWA manifest: Installable on home screen (2 taps)                   │  │  │
│  │   └───────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                   │  │
│  │   CHANNEL B: Feature Phone (SMS + IVR – Mocked for Demo, Twilio ready)          │  │
│  │   ┌───────────────────────────────────────────────────────────────────────────┐  │  │
│  │   │  • SMS: User texts "BUS M1" to 77333 → System auto-replies ETA           │  │  │
│  │   │  • Missed-call IVR: User calls & hangs up → Auto-callback with voice     │  │  │
│  │   │  • Voice: Web Speech API (Hindi/Punjabi) – "8-13 minute mein aa rahi"   │  │  │
│  │   │  • *(Mocked in hackathon demo – real Twilio integration in production)*  │  │  │
│  │   └───────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                   │  │
│  │   CHANNEL C: Admin Dashboard (React – deployed separately)                      │  │
│  │   ┌───────────────────────────────────────────────────────────────────────────┐  │  │
│  │   │  • Fleet map: All active buses on single map                            │  │  │
│  │   │  • Driver Leaderboard: Punctuality scores + rankings                    │  │  │
│  │   │  • Route Analytics: Average delays per route (bar charts)               │  │  │
│  │   │  • GTFS Export: Download GTFS-Realtime feed (Protobuf)                  │  │  │
│  │   └───────────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEPLOYMENT ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                     VERCEL (Frontend)                          │      │
│   │  ┌───────────────────┐  ┌───────────────────┐                 │      │
│   │  │  Passenger PWA    │  │  Admin Dashboard  │                 │      │
│   │  │  / (root)         │  │  /admin           │                 │      │
│   │  └───────────────────┘  └───────────────────┘                 │      │
│   │  • Static build (npm run build)                               │      │
│   │  • HTTPS by default                                           │      │
│   │  • CDN cache enabled                                          │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                              │                                              │
│                              │ (HTTPS)                                     │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                     RENDER (Backend)                           │      │
│   │  ┌─────────────────────────────────────────────────────────┐  │      │
│   │  │  Node.js + Express App                                 │  │      │
│   │  │  • API Gateway (REST endpoints)                        │  │      │
│   │  │  • Socket.io WebSocket server                          │  │      │
│   │  │  • HTTPS by default                                    │  │      │
│   │  │  • Auto-restart on crash                               │  │      │
│   │  └─────────────────────────────────────────────────────────┘  │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                              │                                              │
│                              │ (Internal)                                  │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │                 REDIS CLOUD (Cache)                            │      │
│   │  • Bus positions (TTL: 60s)                                   │      │
│   │  • Check-ins (TTL: 30s)                                       │      │
│   │  • Driver sessions (TTL: 8hrs)                                │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                              │                                              │
│                              │ (Internal)                                  │
│                              ▼                                              │
│   ┌─────────────────────────────────────────────────────────────────┐      │
│   │              SUPABASE / NEON (PostgreSQL)                      │      │
│   │  • Trip sessions (permanent)                                   │      │
│   │  • Driver scores (leaderboard)                                 │      │
│   │  • Historical speeds (ETA baseline)                            │      │
│   │  • GTFS schedules                                              │      │
│   │  • PostGIS extension for spatial queries                       │      │
│   └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SECURITY ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   THREAT                    MITIGATION                                     │
│   ───────────────────────────────────────────────────────────────────────── │
│                                                                             │
│   Fake Passenger Check-ins  → 3-user consensus (200m radius)              │
│                              → One check-in per user per 30s              │
│                                                                             │
│   Unauthorized Driver       → QR code authentication (one-time)           │
│                              → JWT session tokens                         │
│                                                                             │
│   API Abuse                 → Rate limiting (100 req/min per IP)          │
│                              → CORS whitelist (Vercel domain only)        │
│                                                                             │
│   Location Spoofing         → Speed sanity check (>120 km/h = reject)     │
│                              → Route boundary validation                  │
│                                                                             │
│   Data Interception         → HTTPS (Render + Vercel default)             │
│                              → Environment variables for secrets           │
│                                                                             │
│   SQL Injection             → Parameterized queries (pg library)          │
│                              → ORM (Prisma/Knex) if time allows           │
│                                                                             │
│   XSS (Cross-Site Scripting)→ React escapes by default                    │
│                              → Content Security Policy headers             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Performance Metrics

| Component | Metric | Target |
|-----------|--------|--------|
| API Response (GET /buses) | Latency | < 50ms |
| API Response (GET /eta) | Latency | < 100ms |
| WebSocket Event | Latency | < 100ms |
| Map Render | Load time | < 2s |
| Redis Cache | Read speed | < 1ms |
| PostgreSQL (with PostGIS) | Query | < 50ms |
| PWA | Bundle size | < 500KB |
| PWA | Lighthouse Score | > 90 |

## Scalability Considerations

| Dimension | Design | Scalability Limit |
|-----------|--------|-------------------|
| Concurrent Users | Socket.io + Redis adapter | 10,000+ connections |
| Active Buses | Redis in-memory cache | 5,000+ buses |
| Historical Data | PostgreSQL with partitioning | Millions of trips |
| Geospatial Queries | PostGIS GIST indexes | Sub-100ms queries |
| Deployment | Horizontal scaling (Render) | Auto-scaling |
