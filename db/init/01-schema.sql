-- =========================================================
-- BusMitra Database Schema (PostgreSQL + PostGIS)
-- Derived from docs/DATABASE_ARCHITECTURE.md
-- =========================================================

-- Enable PostGIS spatial extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Routes Table
CREATE TABLE IF NOT EXISTS routes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#1a56db',
    polyline JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Stops Table (with PostGIS geometry)
CREATE TABLE IF NOT EXISTS stops (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    order_num INTEGER NOT NULL,
    route_id VARCHAR(50) REFERENCES routes(id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED
);

-- 3. Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    route_id VARCHAR(50) REFERENCES routes(id) ON DELETE SET NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Buses Table
CREATE TABLE IF NOT EXISTS buses (
    id VARCHAR(50) PRIMARY KEY,
    route_id VARCHAR(50) REFERENCES routes(id) ON DELETE SET NULL,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    current_lat DECIMAL(10,8),
    current_lng DECIMAL(11,8),
    speed DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'inactive', -- 'live', 'scheduled', 'crowd_restored', 'inactive'
    last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    heading INTEGER DEFAULT 0,
    onboard INTEGER DEFAULT 0
);

-- 5. Trip Sessions Table
CREATE TABLE IF NOT EXISTS trip_sessions (
    id VARCHAR(50) PRIMARY KEY,
    bus_id VARCHAR(50) REFERENCES buses(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE SET NULL,
    route_id VARCHAR(50) REFERENCES routes(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_sec INTEGER,
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'completed', 'cancelled'
);

-- 6. Check-ins Table (Passenger Relay Consensus)
CREATE TABLE IF NOT EXISTS checkins (
    id VARCHAR(50) PRIMARY KEY,
    bus_id VARCHAR(50) REFERENCES buses(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL,
    lat DECIMAL(10,8) NOT NULL,
    lng DECIMAL(11,8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. GTFS Schedules Table
CREATE TABLE IF NOT EXISTS gtfs_data (
    id VARCHAR(50) PRIMARY KEY,
    route_id VARCHAR(50) REFERENCES routes(id) ON DELETE CASCADE,
    stop_id VARCHAR(50) REFERENCES stops(id) ON DELETE CASCADE,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    stop_sequence INTEGER NOT NULL,
    day_type VARCHAR(20) DEFAULT 'weekday'
);

-- 8. Historical Speeds Table (For Dynamic ETA)
CREATE TABLE IF NOT EXISTS historical_speeds (
    id SERIAL PRIMARY KEY,
    route_id VARCHAR(50) REFERENCES routes(id) ON DELETE CASCADE,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    avg_speed_kmh DECIMAL(5,2) NOT NULL,
    sample_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- Indices for Performance & Spatial Queries
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_stops_location ON stops USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_status ON trip_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkins_bus_id ON checkins(bus_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gtfs_route_stop ON gtfs_data(route_id, stop_id);
