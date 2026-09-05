# 🚌 BusMitra — Real-Time Bus Tracking for Small Indian Cities

> **"Predictability Without Peripherals"**  
> Zero hardware. Triple fallback. Feature-phone inclusive.

## Quick Start

### 1. Backend
```bash
cd backend
npm install
npm run dev   # Starts on http://localhost:3000
```

### 2. Simulator (in a separate terminal)
```bash
cd simulator
npm install
node index.js
```
Commands: `p` (pause), `r` (resume), `s` (status), `q` (quit)

### 3. Test the APIs
```bash
# Health check
curl http://localhost:3000/health

# Get all active buses
curl http://localhost:3000/api/buses

# Get ETA for bus M1
curl http://localhost:3000/api/eta/M1

# Get ETA for specific stop
curl http://localhost:3000/api/eta/M1?stopId=S3

# SMS webhook (feature phone mock)
curl -X POST http://localhost:3000/api/sms-webhook \
  -H "Content-Type: application/json" \
  -d '{"from": "+919876543210", "body": "BUS M1"}'

# Passenger check-in
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{"busId": "M1", "userId": "user123", "lat": 30.8175, "lng": 75.1685}'
```

## Architecture

```
Driver Phone (GPS) → POST /location → In-Memory Cache → Socket.io → Passenger PWA
                                           ↓ (60s timeout)
                     Passenger Check-in → Consensus Engine → Crowd-Restored
                                           ↓ (no check-ins)
                     GTFS Schedule JSON → Static Timetable → "Scheduled"
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/start | Start driver trip |
| POST | /api/location | Update bus GPS |
| POST | /api/checkin | Passenger check-in |
| GET | /api/buses | All active buses |
| GET | /api/eta/:busId | ETA with confidence |
| POST | /api/sms-webhook | SMS gateway mock |
| GET | /health | Server health |

## Team
**SVH-10124 (DayZero)** — Smart VIT Hackathon 2026  
Problem Statement: SVH26003 — Real-Time Public Transport Tracking for Small Cities
