const router = require('express').Router();
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let routes = [];
let stops = [];
let delays = [];
let gtfs = [];

function loadData() {
    try { routes = require(path.join(dataDir, 'routes.json')); } catch (e) {}
    try { stops = require(path.join(dataDir, 'stops.json')); } catch (e) {}
    try { delays = require(path.join(dataDir, 'delays.json')); } catch (e) {}
    try { gtfs = require(path.join(dataDir, 'gtfs.json')); } catch (e) {}
}
loadData();

const STATE_MAP = {
    'M1': 'Punjab',
    'PB': 'Punjab',
    'RJ': 'Rajasthan',
    'UP': 'Uttar Pradesh',
    'MH': 'Maharashtra',
    'KA': 'Karnataka',
    'BR': 'Bihar',
    'AS': 'Assam'
};

// GET /api/routes — List all routes with metadata
router.get('/', (req, res) => {
    loadData();
    const summaries = routes.map((r) => {
        const prefix = r.id.split('-')[0];
        const state = STATE_MAP[prefix] || (r.id === 'M1' ? 'Punjab' : 'India');
        const rStops = stops.filter((s) => s.routeId === r.id);
        const rDelays = delays.filter((d) => d.routeId === r.id);
        const rGtfs = gtfs.filter((g) => g.routeId === r.id);

        return {
            id: r.id,
            code: r.id,
            name: r.name,
            description: r.description,
            color: r.color,
            state,
            stopCount: rStops.length,
            pointCount: r.polyline ? r.polyline.length : 0,
            delaysCount: rDelays.length,
            gtfsScheduleCount: rGtfs.length,
            startStop: rStops[0]?.name || '',
            endStop: rStops[rStops.length - 1]?.name || ''
        };
    });

    res.json(summaries);
});

// GET /api/routes/:id — Get specific route details with polyline, stops, delays
router.get('/:id', (req, res) => {
    loadData();
    const { id } = req.params;
    const route = routes.find((r) => r.id.toLowerCase() === id.toLowerCase());

    if (!route) {
        return res.status(404).json({ error: `Route ${id} not found` });
    }

    const prefix = route.id.split('-')[0];
    const state = STATE_MAP[prefix] || (route.id === 'M1' ? 'Punjab' : 'India');
    const rStops = stops.filter((s) => s.routeId === route.id).sort((a, b) => a.order - b.order);
    const rDelays = delays.filter((d) => d.routeId === route.id);
    const rGtfs = gtfs.filter((g) => g.routeId === route.id);

    res.json({
        ...route,
        state,
        stops: rStops,
        delays: rDelays,
        gtfsScheduleCount: rGtfs.length
    });
});

module.exports = router;
