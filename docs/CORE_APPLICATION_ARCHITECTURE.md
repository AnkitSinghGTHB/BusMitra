# BusMitra – Core Application Architecture

## Architecture Overview

```mermaid
flowchart TD
    subgraph L1 ["LAYER 1: INGESTION (Triple-Fallback)"]
        direction TB
        P1["<b>PRIMARY: Driver PWA</b><br/>Browser Geolocation API<br/>• QR code auto-start (localStorage)<br/>• Sends POST /location every 5s<br/>• Accelerometer + cell-tower auto-detect"]
        P2["<b>SECONDARY: Passenger Relay</b><br/>PWA Check-in Consensus<br/>• 'I'm on this bus' button<br/>• 3-user consensus within 200m<br/>• Sends POST /checkin"]
        P3["<b>TERTIARY: GTFS Offline</b><br/>Pre-loaded Schedule Fallback<br/>• Bundled JSON in IndexedDB<br/>• Displays 'Scheduled: 18-22 min'<br/>• Confidence drops to 40%"]
        
        P1 -->|"If no GPS for 60s"| P2
        P2 -->|"If no check-ins"| P3
    end

    subgraph L2 ["LAYER 2: BACKEND & FUSION"]
        direction TB
        AG["<b>API GATEWAY</b> (Node.js + Express)<br/>• POST /start → Creates trip session<br/>• POST /location → Updates bus position<br/>• POST /checkin → Consensus engine validation<br/>• GET /buses → Returns all active buses<br/>• GET /eta/:id → Distance/Speed ETA calculation"]
        RT["<b>REAL-TIME BROKER</b> (Socket.io + Redis)<br/>• io.emit('bus_update') → pushes to all clients<br/>• Redis TTL: 60s (auto-expire stale buses)"]
        DB[("<b>DATA PERSISTENCE</b> (PostgreSQL + PostGIS)<br/>• Trip history (for analytics)<br/>• Driver scores (leaderboard)<br/>• Historical speeds (ETA baseline)")]
        
        AG --> RT
        RT --> DB
    end

    subgraph L3 ["LAYER 3: DISTRIBUTION"]
        direction TB
        CA["<b>CHANNEL A: Smartphone (PWA)</b><br/>• React + Leaflet live map<br/>• ETA box: 8-13 min (92% Confidence)<br/>• Status: Live (Green) / Scheduled (Grey)<br/>• 'Follow Bus' toggle + EN/HI/PA language<br/>• 'Get SMS Alert' mock"]
        CB["<b>CHANNEL B: Feature Phone (SMS + IVR)</b><br/>• SMS: 'BUS M1' → 'Arriving in 8-13 min'<br/>• Missed-call IVR → Voice in Hindi/Punjabi<br/>• <i>(Mocked in demo – Twilio ready)</i>"]
        CC["<b>CHANNEL C: Admin Dashboard (React)</b><br/>• Fleet map (all active buses)<br/>• Driver punctuality leaderboard<br/>• Route delay analytics"]
    end

    L1 -->|"Ingestion Pipeline"| AG
    RT -->|"Socket.io (WebSocket)"| CA
    AG -->|"SMS / Voice Gateway"| CB
    AG -->|"REST API"| CC

    style L1 fill:#f0fdf4,stroke:#16a34a,stroke-width:2px
    style L2 fill:#eff6ff,stroke:#2563eb,stroke-width:2px
    style L3 fill:#faf5ff,stroke:#9333ea,stroke-width:2px
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BUSMITRA – APPLICATION ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                 LAYER 1: INGESTION (Triple-Fallback)                  │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │    PRIMARY: Driver PWA (Browser Geolocation API)                      │  │
│  │    ┌─────────────────────────────────────────────────────────────┐    │  │
│  │    │  • QR code auto-start (localStorage)                        │    │  │
│  │    │  • Sends POST /location every 5 seconds                     │    │  │
│  │    │  • Accelerometer + cell-tower auto-detect                   │    │  │
│  │    └──────────────────────────────┬──────────────────────────────┘    │  │
│  │                                   │                                   │  │
│  │                                   ▼ (If no GPS for 60s)               │  │
│  │    SECONDARY: Passenger Relay (PWA Check-in)                          │  │
│  │    ┌─────────────────────────────────────────────────────────────┐    │  │
│  │    │  • "I'm on this bus" button                                 │    │  │
│  │    │  • 3-user consensus within 200m                             │    │  │
│  │    │  • Sends POST /checkin                                      │    │  │
│  │    └──────────────────────────────┬──────────────────────────────┘    │  │
│  │                                   │                                   │  │
│  │                                   ▼ (If no check-ins)                 │  │
│  │    TERTIARY: GTFS Offline (Pre-loaded Schedule)                       │  │
│  │    ┌─────────────────────────────────────────────────────────────┐    │  │
│  │    │  • Bundled JSON in PWA (IndexedDB)                          │    │  │
│  │    │  • Displays "Scheduled: 18-22 min"                          │    │  │
│  │    │  • Confidence drops to 40%                                  │    │  │
│  │    └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │                       LAYER 2: BACKEND & FUSION                       │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │    API GATEWAY (Node.js + Express)                                    │  │
│  │    ┌─────────────────────────────────────────────────────────────┐    │  │
│  │    │  POST /start    → Creates trip session                      │    │  │
│  │    │  POST /location → Updates bus position (Redis cache)        │    │  │
│  │    │  POST /checkin  → Consensus engine validation               │    │  │
│  │    │  GET  /buses    → Returns all active buses                  │    │  │
│  │    │  GET  /eta/:id  → Distance/Speed ETA calculation            │    │  │
│  │    └──────────────────────────────┬──────────────────────────────┘    │  │
│  │                                   │                                   │  │
│  │    ┌──────────────────────────────┴──────────────────────────────┐    │  │
│  │    │  REAL-TIME BROKER (Socket.io + Redis)                       │    │  │
│  │    │  • io.emit('bus_update') → pushes to all clients            │    │  │
│  │    │  • Redis TTL: 60s (auto-expire stale buses)                 │    │  │
│  │    └──────────────────────────────┬──────────────────────────────┘    │  │
│  │                                   │                                   │  │
│  │    ┌──────────────────────────────┴──────────────────────────────┐    │  │
│  │    │  DATA PERSISTENCE (PostgreSQL + PostGIS)                    │    │  │
│  │    │  • Trip history (for analytics)                             │    │  │
│  │    │  • Driver scores (leaderboard)                              │    │  │
│  │    │  • Historical speeds (ETA baseline)                         │    │  │
│  │    └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │                         LAYER 3: DISTRIBUTION                         │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │    CHANNEL A: Smartphone (PWA – React + Leaflet)                      │  │
│  │    ┌─────────────────────────────────────────────────────────────┐    │  │
│  │    │  • Live map with moving bus marker                          │    │  │
│  │    │  • ETA box: "8-13 min | 92% Confidence"                     │    │  │
│  │    │  • Status: Green (Live) / Grey (Scheduled)                  │    │  │
│  │    │  • "Follow Bus" toggle (auto-center)                        │    │  │
│  │    │  • Language toggle (EN/HI/PA)                               │    │  │
│  │    │  • "Get SMS Alert" mock                                     │    │  │
│  │    └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │    CHANNEL B: Feature Phone (SMS + IVR)                               │  │
│  │    ┌─────────────────────────────────────────────────────────────┐    │  │
│  │    │  • SMS: "BUS M1" → "Arriving in 8-13 min"                   │    │  │
│  │    │  • Missed-call IVR → Voice in Hindi/Punjabi                 │    │  │
│  │    │  • *(Mocked in demo – Twilio ready for production)*         │    │  │
│  │    └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │    CHANNEL C: Admin Dashboard (React)                                 │  │
│  │    ┌─────────────────────────────────────────────────────────────┐    │  │
│  │    │  • Fleet map (all buses)                                    │    │  │
│  │    │  • Driver leaderboard                                       │    │  │
│  │    │  • Route delay analytics                                    │    │  │
│  │    └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Application Flow

| Step | Component | Action |
|------|-----------|--------|
| 1 | Driver PWA | Scans QR, starts trip |
| 2 | Driver PWA | Sends GPS every 5s |
| 3 | Backend | Stores location in Redis |
| 4 | Backend | Emits Socket.io event |
| 5 | Passenger PWA | Receives event, moves marker |
| 6 | Passenger PWA | Polls /eta every 5s |
| 7 | Backend | Calculates ETA using distance/speed |
| 8 | Passenger PWA | Displays "8-13 min | 92%" |

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend (PWA) | React + Vite + Tailwind |
| Map | Leaflet + OpenStreetMap |
| Backend | Node.js + Express |
| Real-Time | Socket.io |
| Cache | Redis |
| Database | PostgreSQL + PostGIS |
| Deployment | Render (Backend) + Vercel (Frontend) |
