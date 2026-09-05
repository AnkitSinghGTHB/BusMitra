const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://busmitra:busmitra@localhost:5433/busmitra';

const pool = new Pool({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 1500, // Fail fast if container is not running
    idleTimeoutMillis: 5000,
    max: 10
});

// Suppress unhandled error events from idle pool clients
pool.on('error', (err) => {
    // Expected when DB container is stopped
});

const ALLOWED_TABLES = [
    'routes',
    'stops',
    'drivers',
    'buses',
    'trip_sessions',
    'checkins',
    'gtfs_data',
    'historical_speeds'
];

async function getStatus() {
    const start = Date.now();
    try {
        const client = await pool.connect();
        try {
            const versionRes = await client.query('SELECT version(), postgis_full_version()');
            const latencyMs = Date.now() - start;

            // Fetch table counts
            const counts = {};
            for (const table of ALLOWED_TABLES) {
                try {
                    const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
                    counts[table] = parseInt(countRes.rows[0].count, 10);
                } catch (e) {
                    counts[table] = 0;
                }
            }

            return {
                connected: true,
                latencyMs,
                database: 'busmitra',
                host: pool.options.host || 'localhost:5432',
                version: versionRes.rows[0].version ? versionRes.rows[0].version.split(' ')[0] + ' ' + versionRes.rows[0].version.split(' ')[1] : 'PostgreSQL 15',
                postgis: versionRes.rows[0].postgis_full_version ? 'PostGIS Enabled' : 'Available',
                tableCounts: counts
            };
        } finally {
            client.release();
        }
    } catch (err) {
        return {
            connected: false,
            latencyMs: null,
            database: 'busmitra',
            host: 'localhost:5432',
            message: 'Database container is offline.',
            hint: 'Start with: docker compose -f docker-compose.db.yml up -d',
            error: err.code || err.message,
            tableCounts: Object.fromEntries(ALLOWED_TABLES.map(t => [t, 0]))
        };
    }
}

async function getTableRows(tableName, limit = 50) {
    if (!ALLOWED_TABLES.includes(tableName)) {
        throw new Error(`Table '${tableName}' is not allowed or does not exist.`);
    }

    try {
        const res = await pool.query(`SELECT * FROM "${tableName}" ORDER BY 1 LIMIT $1`, [Math.min(limit, 100)]);
        return {
            tableName,
            rowCount: res.rowCount,
            columns: res.fields.map(f => f.name),
            rows: res.rows
        };
    } catch (err) {
        return {
            tableName,
            rowCount: 0,
            columns: [],
            rows: [],
            error: err.message
        };
    }
}

async function syncBus(bus) {
    if (!bus || !bus.busId) return false;
    try {
        await pool.query(`
            INSERT INTO buses (id, route_id, driver_id, current_lat, current_lng, speed, status, heading, last_update)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            ON CONFLICT (id) DO UPDATE SET
                current_lat = EXCLUDED.current_lat,
                current_lng = EXCLUDED.current_lng,
                speed = EXCLUDED.speed,
                status = EXCLUDED.status,
                heading = EXCLUDED.heading,
                last_update = NOW()
        `, [
            bus.busId,
            bus.routeId || 'M1',
            bus.driverId || 'D1',
            bus.lat || 0,
            bus.lng || 0,
            bus.speed || 0,
            bus.status || 'live',
            bus.heading || 0
        ]);
        return true;
    } catch (err) {
        return false;
    }
}

async function recordCheckin(busId, userId, lat, lng) {
    try {
        const id = 'chk-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        await pool.query(`
            INSERT INTO checkins (id, bus_id, user_id, lat, lng, timestamp)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [id, busId, userId, lat, lng]);
        return true;
    } catch (err) {
        return false;
    }
}

module.exports = {
    pool,
    getStatus,
    getTableRows,
    syncBus,
    recordCheckin,
    ALLOWED_TABLES
};
