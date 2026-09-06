/**
 * Simulation API Router
 * REST endpoints for deploying, controlling, and removing simulated buses.
 * All operations go through the SimulationEngine singleton.
 */

const router = require('express').Router();
const simulationEngine = require('../services/simulationEngine');
const { fetchAlternativeRoutes } = require('../services/osrmAlternatives');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let routesData = [];
let stopsData = [];
try { routesData = require(path.join(dataDir, 'routes.json')); } catch (e) {}
try { stopsData = require(path.join(dataDir, 'stops.json')); } catch (e) {}

// POST /api/simulation/deploy — Deploy a new simulated bus
router.post('/deploy', (req, res) => {
    const { busId, routeId, speedKmh, preferredStops, dwellTimeMs, loopMode, polyline, alternateRouteIndex } = req.body;

    if (!routeId && (!polyline || polyline.length === 0)) {
        return res.status(400).json({ error: 'routeId or polyline is required' });
    }

    try {
        const state = simulationEngine.deploy({
            busId,
            routeId: routeId || 'M1',
            speedKmh: speedKmh || 25,
            preferredStops: preferredStops || [],
            dwellTimeMs: dwellTimeMs || 20000,
            loopMode: loopMode !== undefined ? loopMode : true,
            polyline,
            deployedBy: 'admin'
        });

        res.json({ success: true, bus: state });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/simulation/deploy-fleet — Deploy multiple buses at once
router.post('/deploy-fleet', (req, res) => {
    const { buses } = req.body;

    if (!Array.isArray(buses) || buses.length === 0) {
        return res.status(400).json({ error: 'buses array is required' });
    }

    if (buses.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 buses per fleet deployment' });
    }

    const results = simulationEngine.deployFleet(buses);
    res.json({ success: true, deployed: results.filter(r => !r.error).length, results });
});

// GET /api/simulation/buses — List all active simulated buses
router.get('/buses', (req, res) => {
    res.json(simulationEngine.getAllBuses());
});

// GET /api/simulation/buses/:busId — Get specific simulated bus
router.get('/buses/:busId', (req, res) => {
    const state = simulationEngine.getBus(req.params.busId);
    if (!state) {
        return res.status(404).json({ error: `Simulated bus ${req.params.busId} not found` });
    }
    res.json(state);
});

// DELETE /api/simulation/:busId — Remove a simulated bus
router.delete('/:busId', (req, res) => {
    const removed = simulationEngine.remove(req.params.busId);
    if (!removed) {
        return res.status(404).json({ error: `Simulated bus ${req.params.busId} not found` });
    }
    res.json({ success: true, busId: req.params.busId });
});

// DELETE /api/simulation/clear — Remove all simulated buses
router.delete('/clear/all', (req, res) => {
    const count = simulationEngine.clearAll();
    res.json({ success: true, cleared: count });
});

// POST /api/simulation/:busId/pause — Pause a simulated bus
router.post('/:busId/pause', (req, res) => {
    const paused = simulationEngine.pause(req.params.busId);
    if (!paused) {
        return res.status(404).json({ error: `Simulated bus ${req.params.busId} not found` });
    }
    res.json({ success: true, busId: req.params.busId, action: 'paused' });
});

// POST /api/simulation/:busId/resume — Resume a simulated bus
router.post('/:busId/resume', (req, res) => {
    const resumed = simulationEngine.resume(req.params.busId);
    if (!resumed) {
        return res.status(404).json({ error: `Simulated bus ${req.params.busId} not found` });
    }
    res.json({ success: true, busId: req.params.busId, action: 'resumed' });
});

// PUT /api/simulation/:busId/speed — Update speed of a simulated bus
router.put('/:busId/speed', (req, res) => {
    const { speedKmh } = req.body;
    if (!speedKmh || typeof speedKmh !== 'number' || speedKmh < 5 || speedKmh > 60) {
        return res.status(400).json({ error: 'speedKmh must be a number between 5 and 60' });
    }

    const updated = simulationEngine.setSpeed(req.params.busId, speedKmh);
    if (!updated) {
        return res.status(404).json({ error: `Simulated bus ${req.params.busId} not found` });
    }
    res.json({ success: true, busId: req.params.busId, speedKmh });
});

// PUT /api/simulation/:busId/stops — Update preferred stops
router.put('/:busId/stops', (req, res) => {
    const { preferredStops } = req.body;
    if (!Array.isArray(preferredStops)) {
        return res.status(400).json({ error: 'preferredStops must be an array of stop IDs' });
    }

    const updated = simulationEngine.setPreferredStops(req.params.busId, preferredStops);
    if (!updated) {
        return res.status(404).json({ error: `Simulated bus ${req.params.busId} not found` });
    }
    res.json({ success: true, busId: req.params.busId, preferredStops });
});

// PUT /api/simulation/:busId/route — Switch to alternate route
router.put('/:busId/route', (req, res) => {
    const { polyline, routeId } = req.body;
    if (!polyline || !Array.isArray(polyline) || polyline.length === 0) {
        return res.status(400).json({ error: 'polyline array is required' });
    }

    const updated = simulationEngine.setRoute(req.params.busId, polyline, routeId);
    if (!updated) {
        return res.status(404).json({ error: `Simulated bus ${req.params.busId} not found` });
    }
    res.json({ success: true, busId: req.params.busId, routeId, pointCount: polyline.length });
});

// GET /api/simulation/routes/:routeId/alternatives — Get OSRM alternate routes
router.get('/routes/:routeId/alternatives', async (req, res) => {
    const { routeId } = req.params;
    const route = routesData.find(r => r.id === routeId);

    if (!route || !route.polyline || route.polyline.length < 2) {
        return res.status(404).json({ error: `Route ${routeId} not found or has insufficient data` });
    }

    const first = route.polyline[0];
    const last = route.polyline[route.polyline.length - 1];

    const alternatives = await fetchAlternativeRoutes(first.lat, first.lng, last.lat, last.lng);

    res.json({
        routeId,
        origin: { lat: first.lat, lng: first.lng },
        destination: { lat: last.lat, lng: last.lng },
        originalPointCount: route.polyline.length,
        alternatives
    });
});

// GET /api/simulation/routes — Get available routes for deployment
router.get('/routes', (req, res) => {
    const summaries = routesData.map(r => {
        const rStops = stopsData.filter(s => s.routeId === r.id).sort((a, b) => a.order - b.order);
        return {
            id: r.id,
            name: r.name,
            description: r.description,
            color: r.color,
            pointCount: r.polyline ? r.polyline.length : 0,
            stops: rStops.map(s => ({ id: s.id, name: s.name, order: s.order, lat: s.lat, lng: s.lng }))
        };
    });
    res.json(summaries);
});

// GET /api/simulation/status — Engine status
router.get('/status', (req, res) => {
    res.json({
        active: true,
        simulatedBusCount: simulationEngine.count,
        buses: simulationEngine.getAllBuses()
    });
});

module.exports = router;
