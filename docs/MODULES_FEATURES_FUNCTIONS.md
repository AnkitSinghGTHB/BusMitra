# BusMitra – Modules, Features & Functions

## Module Hierarchy

```
BUSMITRA
│
├── 1. PASSENGER MODULE (Primary)
│   ├── 1.1 Live Map View
│   │   ├── Function: renderMap()
│   │   ├── Function: updateMarker(lat, lng, heading)
│   │   ├── Function: drawRoute(polyline)
│   │   └── Function: autoFollow(boolean)
│   │
│   ├── 1.2 ETA Display
│   │   ├── Function: calculateETA(busId, stopId)
│   │   ├── Function: displayETA(min, max, confidence)
│   │   ├── Function: showFreshness(lastUpdate)
│   │   └── Function: updateStatusBadge(source)
│   │
│   ├── 1.3 Multi-Channel Access
│   │   ├── Function: showSMSModal()
│   │   ├── Function: showIVRModal()
│   │   └── Function: speakVoice(text, lang)
│   │
│   ├── 1.4 Language Support
│   │   ├── Function: toggleLanguage(lang)
│   │   └── Function: loadTranslations(lang)
│   │
│   └── 1.5 Passenger Relay
│       ├── Function: checkIn(busId, lat, lng)
│       └── Function: verifyConsensus(busId)
│
├── 2. DRIVER MODULE
│   ├── 2.1 QR Code Auto-Start
│   │   ├── Function: scanQR()
│   │   └── Function: saveBusId(busId)
│   │
│   ├── 2.2 Trip State Machine
│   │   ├── Function: startTrip(busId, route)
│   │   └── Function: endTrip(busId)
│   │
│   ├── 2.3 Gamification Dashboard
│   │   ├── Function: getDriverScore(driverId)
│   │   └── Function: getLeaderboard()
│   │
│   └── 2.4 Incident Reporting
│       └── Function: reportIncident(busId, type)
│
├── 3. ADMIN MODULE
│   ├── 3.1 Fleet Monitoring
│   │   └── Function: getAllBuses()
│   │
│   ├── 3.2 Driver Leaderboard
│   │   └── Function: getDriverRanking()
│   │
│   ├── 3.3 Route Analytics
│   │   └── Function: getRouteDelays(routeId)
│   │
│   └── 3.4 GTFS Import/Export
│       ├── Function: importGTFS(file)
│       └── Function: exportGTFSRT()
│
└── 4. SYSTEM MODULE
    ├── 4.1 Fallback Engine
    │   ├── Function: checkStaleBuses()
    │   └── Function: switchToGTFS(busId)
    │
    ├── 4.2 Consensus Engine
    │   ├── Function: addCheckin(busId, lat, lng, userId)
    │   └── Function: validateConsensus(busId)
    │
    └── 4.3 ETA Calculator
        ├── Function: getHistoricalSpeed(timeOfDay)
        ├── Function: haversine(lat1, lng1, lat2, lng2)
        └── Function: calculateConfidence(freshness, variance)
```

## Core Functions (Code-Level)

| Function | Module | Purpose |
|----------|--------|---------|
| `startTrip(busId, route)` | Driver | Creates trip session |
| `updateLocation(busId, lat, lng)` | Driver | Sends GPS to backend |
| `getBuses()` | Passenger | Polls for active buses |
| `getETA(busId, stopId)` | Passenger | Calculates arrival time |
| `checkIn(busId, lat, lng, userId)` | Passenger | Adds passenger check-in |
| `validateConsensus(busId)` | System | Checks 3-user rule |
| `checkStaleBuses()` | System | 60s timer → offline status |
| `toggleLanguage(lang)` | Passenger | Swaps UI translations |
| `showSMSModal()` | Passenger | Displays feature-phone mock |
| `speakVoice(text, lang)` | Passenger | Web Speech API audio |
| `autoFollow(boolean)` | Passenger | Map centering toggle |

## Feature-Function Mapping

| Feature | Primary Function | Secondary Functions |
|---------|------------------|---------------------|
| Live Map | `renderMap()` | `updateMarker()`, `drawRoute()` |
| ETA Display | `getETA()` | `displayETA()`, `showFreshness()` |
| Fallback | `checkStaleBuses()` | `switchToGTFS()` |
| SMS Access | `showSMSModal()` | `simulateSMSReply()` |
| IVR Access | `showIVRModal()` | `speakVoice()` |
| Language | `toggleLanguage()` | `loadTranslations()` |
| Passenger Relay | `checkIn()` | `validateConsensus()` |
| Gamification | `getDriverScore()` | `getLeaderboard()` |
| Admin Fleet | `getAllBuses()` | `getRouteDelays()` |
