const path = require('path');
const router = require('express').Router();
const etaCalculator = require('../services/etaCalculator');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let stops = [];
try { stops = require(path.join(dataDir, 'stops.json')); } catch(e) {}

router.get('/:busId', (req, res) => {
    const busId = req.params.busId;
    let stopId = req.query.stopId;
    
    // Default to last stop on the bus's route
    if (!stopId) {
        const busCache = require('../services/busCache');
        const bus = busCache.getBus(busId);
        if (bus) {
            const routeStops = stops.filter(s => s.routeId === bus.routeId).sort((a, b) => a.order - b.order);
            stopId = routeStops.length > 0 ? routeStops[routeStops.length - 1].id : 'S8';
        } else {
            stopId = 'S8';
        }
    }
    
    const eta = etaCalculator.calculateETA(busId, stopId);
    
    if (!eta) {
        return res.status(404).json({ error: 'Bus not found or ETA unavailable' });
    }
    
    // Find stop name for response
    const stop = stops.find(s => s.id === stopId);
    
    res.json({ ...eta, busId, stopId, stopName: stop ? stop.name : stopId });
});

module.exports = router;
