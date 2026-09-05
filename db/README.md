# BusMitra Isolated Database (PostgreSQL + PostGIS)

This directory contains the database setup for BusMitra.
As per system architecture specifications, **the database runs in an isolated Docker container** independently from the frontend and backend.

## Quick Start

### 1. Launch Isolated Database
From the project root:
```bash
docker compose -f docker-compose.db.yml up -d
```

### 2. Verify Container Health
```bash
docker compose -f docker-compose.db.yml ps
```

### 3. Connect via psql
```bash
docker exec -it busmitra-db psql -U busmitra -d busmitra
```

### 4. Stop Container
```bash
docker compose -f docker-compose.db.yml down
```

To also delete database volume data:
```bash
docker compose -f docker-compose.db.yml down -v
```

---

## Database Details

- **Image:** `postgis/postgis:15-3.3`
- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `busmitra`
- **User:** `busmitra`
- **Password:** `busmitra`
- **Connection URI:** `postgresql://busmitra:busmitra@localhost:5432/busmitra`

## Automatic Initialization

The `./db/init` directory is mounted to `/docker-entrypoint-initdb.d` inside the container:
- `01-schema.sql`: Enables `postgis` & `uuid-ossp`, creates all tables (`routes`, `stops`, `drivers`, `buses`, `trip_sessions`, `checkins`, `gtfs_data`, `historical_speeds`) and spatial GIST indexes.
- `02-seed.sql`: Seeds Route M1 (Moga → Dagru), 8 bus stops with spatial coordinates, default driver, GTFS schedule entries, and speed profiles.
