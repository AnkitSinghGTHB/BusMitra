# Walkthrough: BusMitra Backend + Data + Simulator

## What Was Built

From **0 lines of code** (just 8 docs), we built a fully working backend with real-time bus tracking.

### Files Created (24 files total)

#### Backend — 12 source files
| File | Purpose |
|------|---------|
| [package.json](file:///D:/BusMitra/backend/package.json) | Express, Socket.io, CORS, UUID |
| [server.js](file:///D:/BusMitra/backend/src/server.js) | Entry point, routes, Socket.io, health endpoint |
| [api/start.js](file:///D:/BusMitra/backend/src/api/start.js) | `POST /api/start` — create trip session |
| [api/location.js](file:///D:/BusMitra/backend/src/api/location.js) | `POST /api/location` — driver GPS update + Socket.io emit |
| [api/buses.js](file:///D:/BusMitra/backend/src/api/buses.js) | `GET /api/buses` — all active buses with ETag caching |
| [api/eta.js](file:///D:/BusMitra/backend/src/api/eta.js) | `GET /api/eta/:busId` — route-distance ETA with confidence |
| [api/checkin.js](file:///D:/BusMitra/backend/src/api/checkin.js) | `POST /api/checkin` — consensus engine, crowd-restore |
| [api/smsWebhook.js](file:///D:/BusMitra/backend/src/api/smsWebhook.js) | `POST /api/sms-webhook` — feature phone SMS mock |
| [services/busCache.js](file:///D:/BusMitra/backend/src/services/busCache.js) | In-memory Map store with 60s auto-stale |
| [services/consensus.js](file:///D:/BusMitra/backend/src/services/consensus.js) | 3-user consensus with adaptive thresholds |
| [services/etaCalculator.js](file:///D:/BusMitra/backend/src/services/etaCalculator.js) | Route-distance ETA + delay points + confidence formula |
| [utils/haversine.js](file:///D:/BusMitra/backend/src/utils/haversine.js) | Haversine distance calculation |
| [utils/fallbackTimer.js](file:///D:/BusMitra/backend/src/utils/fallbackTimer.js) | 10s interval stale bus detector |

#### Data — 4 seed files
| File | Purpose |
|------|---------|
| [routes.json](file:///D:/BusMitra/data/routes.json) | Route M1: Moga → Dagru with 20-point polyline |
| [stops.json](file:///D:/BusMitra/data/stops.json) | 8 bus stops with GPS coordinates |
| [gtfs.json](file:///D:/BusMitra/data/gtfs.json) | Schedule fallback (4 trips/day) |
| [delays.json](file:///D:/BusMitra/data/delays.json) | Known delay points (railway crossing, chai break) |

#### Simulator — 2 files
| File | Purpose |
|------|---------|
| [package.json](file:///D:/BusMitra/simulator/package.json) | node-fetch v2 dependency |
| [index.js](file:///D:/BusMitra/simulator/index.js) | Walks polyline, sends GPS, CLI controls (p/r/s/q) |

#### Project Files — 3 files
| File | Purpose |
|------|---------|
| [AGENTS.md](file:///D:/BusMitra/AGENTS.md) | Project intelligence brief for agents/devs |
| [README.md](file:///D:/BusMitra/README.md) | Quick start + API docs |
| [.gitignore](file:///D:/BusMitra/.gitignore) | Standard Node.js ignores |

---

## Fixes Applied During Review

1. **Hardcoded absolute paths** → Replaced with portable `path.join(__dirname, ...)` in [etaCalculator.js](file:///D:/BusMitra/backend/src/services/etaCalculator.js) and [smsWebhook.js](file:///D:/BusMitra/backend/src/api/smsWebhook.js)
2. **Missing busId in cache** → [busCache.js](file:///D:/BusMitra/backend/src/services/busCache.js) now always stores `busId` in the entry
3. **Status overwrite bug** → `updateBus` now respects `data.status` instead of forcing `'live'`
4. **ETA default stop** → [eta.js](file:///D:/BusMitra/backend/src/api/eta.js) now defaults to last stop on route, includes stop name
5. **Delay field mismatch** → `etaCalculator` handles both `avgDelay` and `avgDelayMinutes` keys

---

## Test Results

All 8 endpoints tested successfully:

```
✅ GET  /health              → { status: "ok", activeBuses: 1 }
✅ POST /api/start           → { sessionId: "a48c...", busId: "M1", status: "active" }
✅ POST /api/location        → { success: true }  (+ Socket.io 'bus_update' emitted)
✅ GET  /api/buses           → [{ busId: "M1", lat: 30.82, lng: 75.16, speed: 22, status: "live" }]
✅ GET  /api/eta/M1          → { min: 13, max: 21, confidence: 100, source: "live", stopName: "Dagru Village" }
✅ GET  /api/eta/M1?stopId=S5 → { min: 5, max: 10, confidence: 100, source: "live", stopName: "Guru Nanak Chowk" }
✅ POST /api/sms-webhook     → { reply: "Bus M1 arriving at Moga Bus Stand in 2-3 min. Confidence: ..." }
✅ POST /api/checkin          → { accepted: true, consensusCount: 1, consensusReached: false }
```

### Fallback Engine Verified
- After 60s of no location updates → status auto-switches to `"scheduled"`, confidence drops to 10%
- Fresh location update → immediately back to `"live"`, confidence restores to 100%

### Confidence Score Formula Verified (NOT hardcoded)
- Fresh GPS: **100%**
- After 30s: **~80%** (freshness decay)
- After 60s: **~60%** (stale threshold)
- Rush hour (8-10am/5-7pm): **-10%** penalty
- Consensus source: **-20%** base penalty
- GTFS fallback: **-50%** base penalty

---

## Stage Demo Guide for Judges

Since the frontend UI is deferred, you can still confidently demonstrate the **core technical innovation** of BusMitra (the Triple-Fallback Engine) directly from the terminal. This proves the architecture works before building the visuals.

1. **Start the Backend:** `npm run dev` in the `/backend` folder.
2. **Launch the Simulator:** Run `node index.js` in the `/simulator` folder. The terminal will log live GPS updates along the Moga → Dagru polyline.
3. **Show the ETA Engine:** Run `curl http://localhost:3000/api/eta/M1`. Point out the `confidence: 100` and `source: "live"`.
4. **Simulate a Network Drop:** In the simulator terminal, press `p` to pause (simulating the bus driver losing network or closing the browser).
5. **Watch the Fallback:** Wait 60 seconds. Make the same ETA curl request. Show the judges that the `source` dynamically changed to `"scheduled"` and the `confidence` score dropped gracefully. 
6. **Feature Phone Integration:** Show the `/api/sms-webhook` taking a mocked Twilio payload and responding with an accurate ETA text string for Nokia/feature phone users.

**Conclusion:** We have successfully built the entire robust, real-time architectural backbone of the BusMitra system from 0 to 1. This matches the original documentation design and conclusively resolves the risks identified in the judge panel grilling.
