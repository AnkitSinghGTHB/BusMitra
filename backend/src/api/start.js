const router = require('express').Router();
const busCache = require('../services/busCache');
const driverAuth = require('../middleware/driverAuth');
const { v4: uuidv4 } = require('uuid');

router.post('/', driverAuth, (req, res) => {
    const { busId, driverId, routeId, lat, lng, customPolyline } = req.body;
    
    if (!busId) {
        return res.status(400).json({ error: 'busId is required' });
    }

    if (lat !== undefined && lng !== undefined) {
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ error: 'Coordinates must be valid numbers' });
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ error: 'Coordinates out of range' });
        }
    }
    
    const existing = busCache.getBus(busId);
    if (existing && existing.status === 'live') {
        return res.status(409).json({ error: 'Bus already active', sessionId: existing.sessionId });
    }
    
    const sessionId = uuidv4();
    busCache.updateBus(busId, {
        busId,
        driverId: driverId || 'D1',
        routeId: routeId || 'M1',
        lat: lat || 30.8163,
        lng: lng || 75.1720,
        speed: 0,
        heading: 0,
        status: 'live',
        sessionId,
        customPolyline,
        startedAt: Date.now()
    });

    const io = req.app.get('io');
    if (io) {
        io.emit('bus_update', busCache.getBus(busId));
    }
    
    res.json({
        sessionId,
        busId,
        routeId: routeId || 'M1',
        status: 'active'
    });
});

module.exports = router;
