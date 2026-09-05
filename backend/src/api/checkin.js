const router = require('express').Router();
const consensus = require('../services/consensus');
const busCache = require('../services/busCache');

router.post('/', (req, res) => {
    const { busId, userId, lat, lng } = req.body;
    
    consensus.addCheckin(busId, userId, lat, lng);
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
