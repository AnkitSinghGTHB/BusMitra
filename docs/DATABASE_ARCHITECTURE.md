# BusMitra – Database Architecture

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     BUS         │     │    ROUTE        │     │     STOP        │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id: string (PK) │────▶│ id: string (PK) │────▶│ id: string (PK) │
│ route_id: FK    │     │ name: string    │     │ name: string    │
│ driver_id: FK   │     │ description: str│     │ lat: decimal    │
│ current_lat:dec │     │ color: string   │     │ lng: decimal    │
│ current_lng:dec │     │ polyline: json  │     │ order: integer  │
│ speed: decimal  │     └─────────────────┘     │ route_id: FK   │
│ status: enum    │                              └─────────────────┘
│ last_update:ts  │
│ heading: int    │     ┌─────────────────┐
│ onboard: int    │     │   DRIVER        │
└─────────────────┘     ├─────────────────┤
         │              │ id: string (PK) │
         ▼              │ name: string    │
┌─────────────────┐     │ phone: string   │
│   CHECKIN       │     │ route_id: FK    │
├─────────────────┤     │ score: integer  │
│ id: string (PK) │     └─────────────────┘
│ bus_id: FK      │
│ user_id: string │     ┌─────────────────┐
│ lat: decimal    │     │   TRIP_SESSION  │
│ lng: decimal    │     ├─────────────────┤
│ timestamp: ts   │     │ id: string (PK) │
└─────────────────┘     │ bus_id: FK      │
                        │ driver_id: FK   │
┌─────────────────┐     │ route_id: FK    │
│   GTFS_DATA     │     │ start_time: ts  │
├─────────────────┤     │ end_time: ts    │
│ id: string (PK) │     │ duration_sec: int│
│ route_id: FK    │     │ status: enum    │
│ stop_id: FK     │     └─────────────────┘
│ arrival_time:ts │
│ departure_time:ts│
│ stop_sequence:int│
└─────────────────┘
```

## Data Storage Strategy

| Data Type | Storage | TTL | Index |
|-----------|---------|-----|-------|
| Live bus positions | Redis (in-memory) | 60s | bus_id |
| Trip sessions | PostgreSQL | Permanent | bus_id, driver_id |
| Check-ins | Redis | 30s | bus_id |
| Driver scores | PostgreSQL | Permanent | driver_id |
| GTFS schedules | PostgreSQL + JSON (PWA) | Permanent | route_id, stop_id |
| Historical speeds | PostgreSQL | Permanent | route_id, hour |

## PostgreSQL Schema (DDL)

```sql
-- Bus table
CREATE TABLE buses (
    id VARCHAR(50) PRIMARY KEY,
    route_id VARCHAR(50) NOT NULL,
    driver_id VARCHAR(50) NOT NULL,
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    speed DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'inactive',
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    heading INTEGER DEFAULT 0,
    onboard INTEGER DEFAULT 0
);

-- Route table
CREATE TABLE routes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#1a56db',
    polyline JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stop table (with PostGIS)
CREATE TABLE stops (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    order_num INTEGER NOT NULL,
    route_id VARCHAR(50) REFERENCES routes(id)
);

-- Driver table
CREATE TABLE drivers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    route_id VARCHAR(50) REFERENCES routes(id),
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip session table
CREATE TABLE trip_sessions (
    id VARCHAR(50) PRIMARY KEY,
    bus_id VARCHAR(50) REFERENCES buses(id),
    driver_id VARCHAR(50) REFERENCES drivers(id),
    route_id VARCHAR(50) REFERENCES routes(id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_sec INTEGER,
    status VARCHAR(20) DEFAULT 'active'
);

-- Check-in table (for passenger relay)
CREATE TABLE checkins (
    id VARCHAR(50) PRIMARY KEY,
    bus_id VARCHAR(50) REFERENCES buses(id),
    user_id VARCHAR(50) NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GTFS data table
CREATE TABLE gtfs_data (
    id VARCHAR(50) PRIMARY KEY,
    route_id VARCHAR(50) REFERENCES routes(id),
    stop_id VARCHAR(50) REFERENCES stops(id),
    arrival_time TIME,
    departure_time TIME,
    stop_sequence INTEGER,
    day_type VARCHAR(20) DEFAULT 'weekday'
);

-- Historical speeds (for ETA calculation)
CREATE TABLE historical_speeds (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(50) REFERENCES routes(id),
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    avg_speed_kmh DECIMAL(5,2) NOT NULL,
    sample_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PostGIS spatial index for nearest-stop queries
CREATE INDEX idx_stops_location ON stops USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326));

-- Indexes for performance
CREATE INDEX idx_buses_status ON buses(status);
CREATE INDEX idx_trip_sessions_status ON trip_sessions(status);
CREATE INDEX idx_checkins_bus_id ON checkins(bus_id);
CREATE INDEX idx_checkins_timestamp ON checkins(timestamp DESC);
```

## Redis Key-Value Structure

```
# Live bus locations (TTL: 60s)
bus:M1 → {
    "busId": "M1",
    "lat": 30.5,
    "lng": 76.5,
    "speed": 25,
    "heading": 180,
    "status": "live",
    "lastUpdate": 1234567890
}

# Check-in consensus (TTL: 30s)
checkins:M1 → [
    { "userId": "u1", "lat": 30.51, "lng": 76.51, "ts": 1234567800 },
    { "userId": "u2", "lat": 30.50, "lng": 76.50, "ts": 1234567810 },
    { "userId": "u3", "lat": 30.52, "lng": 76.52, "ts": 1234567820 }
]

# Driver session
session:driver123 → {
    "driverId": "d1",
    "busId": "M1",
    "routeId": "R1",
    "startTime": 1234567890
}
```

## Data Flow: ETA Calculation

```
[GET /eta/:busId/:stopId]
    ↓
1. Fetch bus location from Redis (or PostgreSQL)
2. Fetch stop location from PostgreSQL
3. Calculate distance using Haversine formula
4. Fetch historical speed for this route + time-of-day
5. Calculate base ETA = distance / speed
6. Calculate variance = base ETA * 0.3
7. Calculate confidence based on data freshness
8. Return { min, max, confidence, source }
```

## Data Flow: Fallback Switch

```
[Check stale buses - runs every 10s]
    ↓
1. For each bus in Redis:
    a. If status = 'live' AND (now - lastUpdate) > 60s:
        → status = 'offline'
        → Emit Socket.io event
    b. If status = 'offline' AND check-ins reach consensus:
        → status = 'crowd_restored'
        → Emit Socket.io event
```

## Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| buses | status | Filter active buses |
| stops | (lat, lng) GIST | Nearest-stop queries |
| checkins | (bus_id, timestamp) | Consensus validation |
| trip_sessions | (status, driver_id) | Active trips lookup |
| historical_speeds | (route_id, hour) | ETA calculation |
