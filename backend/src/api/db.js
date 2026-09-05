const router = require('express').Router();
const dbService = require('../services/db');
const busCache = require('../services/busCache');

// GET /api/db/status — DB connection health, latency, table counts
router.get('/status', async (req, res) => {
    const status = await dbService.getStatus();
    res.json(status);
});

// GET /api/db/tables — List all available tables
router.get('/tables', (req, res) => {
    res.json({ tables: dbService.ALLOWED_TABLES });
});

// GET /api/db/table/:name — Fetch rows from a table
router.get('/table/:name', async (req, res) => {
    const tableName = req.params.name.toLowerCase();
    const limit = parseInt(req.query.limit, 10) || 50;

    if (!dbService.ALLOWED_TABLES.includes(tableName)) {
        return res.status(400).json({
            error: `Invalid table name '${tableName}'. Allowed: ${dbService.ALLOWED_TABLES.join(', ')}`
        });
    }

    const data = await dbService.getTableRows(tableName, limit);
    res.json(data);
});

// POST /api/db/sync — Sync in-memory buses to DB
router.post('/sync', async (req, res) => {
    const buses = busCache.getAllBuses();
    let synced = 0;
    for (const bus of buses) {
        const ok = await dbService.syncBus(bus);
        if (ok) synced++;
    }
    res.json({
        total: buses.length,
        synced,
        message: synced > 0 ? `Synced ${synced} buses to database.` : 'Database offline or no buses to sync.'
    });
});

module.exports = router;
