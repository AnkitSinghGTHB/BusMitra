const router = require('express').Router();
const busCache = require('../services/busCache');
const { v4: uuidv4 } = require('uuid');

router.post('/', (req, res) => {
    const { busId, driverId, routeId, lat, lng } = req.body;
    
    const existing = busCache.getBus(busId);
    if (existing && existing.status === 'live') {
        return res.status(409).json({ error: 'Bus already active' });
    }
    
    busCache.updateBus(busId, { busId, driverId, routeId, lat, lng, speed: 0, heading: 0, status: 'live' });
    
    res.json({
        sessionId: uuidv4(),
        busId,
        status: 'active'
    });
});

module.exports = router;
