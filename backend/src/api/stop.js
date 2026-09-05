const router = require('express').Router();
const busCache = require('../services/busCache');
const driverAuth = require('../middleware/driverAuth');

router.post('/', driverAuth, (req, res) => {
    const { busId, sessionId } = req.body;
    
    if (!busId) {
        return res.status(400).json({ error: 'busId is required' });
    }
    
    const bus = busCache.getBus(busId);
    if (!bus) {
        return res.status(404).json({ error: 'Bus not found or already inactive' });
    }

    if (sessionId && bus.sessionId && bus.sessionId !== sessionId) {
        return res.status(403).json({ error: 'Session ID mismatch' });
    }
    
    // Mark as completed and stopped
    busCache.updateBus(busId, {
        status: 'completed',
        speed: 0,
        endedAt: Date.now()
    });

    const io = req.app.get('io');
    if (io) {
        io.emit('status_change', { busId, status: 'completed', source: 'driver' });
        io.emit('bus_update', busCache.getBus(busId));
    }

    res.json({
        success: true,
        busId,
        message: 'Trip successfully ended'
    });
});

module.exports = router;
