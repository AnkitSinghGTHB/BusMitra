const router = require('express').Router();
const busCache = require('../services/busCache');
const dbService = require('../services/db');
const driverAuth = require('../middleware/driverAuth');

router.post('/', driverAuth, (req, res) => {
    const { busId, lat, lng, speed, heading } = req.body;
    
    if (!busId || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Missing parameters: busId, lat, and lng are required' });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Coordinates must be valid numbers' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Coordinates out of range (-90 to 90 lat, -180 to 180 lng)' });
    }
    
    if (speed !== undefined) {
        if (typeof speed !== 'number' || isNaN(speed) || speed < 0 || speed > 120) {
            return res.status(400).json({ error: 'Invalid speed: must be a number between 0 and 120 km/h' });
        }
    }

    if (heading !== undefined) {
        if (typeof heading !== 'number' || isNaN(heading) || heading < 0 || heading > 360) {
            return res.status(400).json({ error: 'Invalid heading: must be a number between 0 and 360 degrees' });
        }
    }
    
    busCache.updateBus(busId, { lat, lng, speed: speed || 0, heading: heading || 0, status: 'live' });
    const bus = busCache.getBus(busId);
    
    const io = req.app.get('io');
    if (io) {
        io.emit('bus_update', bus);
    }
    
    // Asynchronously mirror to DB if running
    dbService.syncBus(bus).catch(() => {});
    
    res.json({ success: true });
});

module.exports = router;
