const router = require('express').Router();
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let stops = [];

function loadStops() {
    try { stops = require(path.join(dataDir, 'stops.json')); } catch (e) {}
}
loadStops();

// GET /api/stops — List stops, optionally filtered by ?routeId=...
router.get('/', (req, res) => {
    loadStops();
    const { routeId } = req.query;

    if (routeId) {
        const filtered = stops
            .filter((s) => s.routeId.toLowerCase() === routeId.toLowerCase())
            .sort((a, b) => a.order - b.order);
        return res.json(filtered);
    }

    res.json(stops);
});

module.exports = router;
