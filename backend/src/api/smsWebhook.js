const path = require('path');
const router = require('express').Router();
const busCache = require('../services/busCache');
const etaCalculator = require('../services/etaCalculator');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let gtfsData = [];
try { gtfsData = require(path.join(dataDir, 'gtfs.json')); } catch(e) {}
let stops = [];
try { stops = require(path.join(dataDir, 'stops.json')); } catch(e) {}

router.post('/', (req, res) => {
    const { from, body } = req.body;
    
    if (!body) {
        return res.json({ reply: 'Invalid format. Send "BUS M1" for Bus M1 ETA.' });
    }
    
    const match = body.trim().match(/^BUS\s+(\w+)$/i);
    if (!match) {
        return res.json({ reply: 'Invalid format. Send "BUS M1" for Bus M1 ETA.' });
    }
    
    const routeId = match[1].toUpperCase();
    let bus = busCache.getBusByRoute(routeId);
    
    if (!bus) {
        const gtfsBus = gtfsData.find(b => b.routeId === routeId);
        if (gtfsBus) {
            bus = { busId: gtfsBus.busId, status: 'gtfs' };
            busCache.updateBus(gtfsBus.busId, { routeId, status: 'gtfs', lat: 0, lng: 0 });
        }
    }
    
    if (!bus) {
        return res.json({ reply: `No information available for bus route ${routeId}.` });
    }
    
    const stopId = stops.length > 0 ? stops[0].id : 'stop_1';
    const stopName = stops.find(s => s.id === stopId)?.name || stopId;
    
    const eta = etaCalculator.calculateETA(bus.busId, stopId);
    if (eta) {
        res.json({ reply: `Bus ${routeId} arriving at ${stopName} in ${eta.min}-${eta.max} min. Confidence: ${eta.confidence}%` });
    } else {
        res.json({ reply: `Could not calculate ETA for ${routeId}.` });
    }
});

module.exports = router;
