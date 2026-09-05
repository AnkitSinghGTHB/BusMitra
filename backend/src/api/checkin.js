const router = require('express').Router();
const consensus = require('../services/consensus');
const busCache = require('../services/busCache');
const dbService = require('../services/db');

router.post('/', (req, res) => {
    const { busId, userId, lat, lng } = req.body;
    
    if (!busId || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Missing parameters: busId, lat, and lng are required' });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Coordinates must be valid numbers' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Coordinates out of range' });
    }

    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    
    const accepted = consensus.addCheckin(busId, userId, lat, lng, ip);
    if (!accepted) {
        return res.status(429).json({
            accepted: false,
            message: 'Check-in rejected: device/user is on a 30-second cooldown to prevent spoofing.'
        });
    }

    dbService.recordCheckin(busId, userId, lat, lng).catch(() => {});
    const result = consensus.validateConsensus(busId);
    
    let consensusReached = false;
    
    if (result.valid) {
        consensusReached = true;
        const bus = busCache.getBus(busId);
        
        if (bus && bus.status === 'scheduled') {
            busCache.updateBus(busId, { lat: result.avgLat, lng: result.avgLng, status: 'crowd_restored' });
            
            const io = req.app.get('io');
            if (io) {
                io.emit('bus_update', busCache.getBus(busId));
            }
        }
    }
    
    res.json({ accepted: true, consensusCount: result.count, consensusReached });
});

module.exports = router;
