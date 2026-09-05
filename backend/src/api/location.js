const router = require('express').Router();
const busCache = require('../services/busCache');

router.post('/', (req, res) => {
    const { busId, lat, lng, speed, heading } = req.body;
    
    if (!busId || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    
    if (speed > 120) {
        return res.status(400).json({ error: 'Invalid speed' });
    }
    
    busCache.updateBus(busId, { lat, lng, speed, heading });
    
    const io = req.app.get('io');
    if (io) {
        io.emit('bus_update', busCache.getBus(busId));
    }
    
    res.json({ success: true });
});

module.exports = router;
