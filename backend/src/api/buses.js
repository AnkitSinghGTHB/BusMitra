const router = require('express').Router();
const busCache = require('../services/busCache');
const crypto = require('crypto');

router.get('/', (req, res) => {
    const { simulated } = req.query;
    
    let buses;
    if (simulated === 'only') {
        buses = busCache.getSimulatedBuses();
    } else if (simulated === 'exclude') {
        buses = busCache.getRealBuses();
    } else {
        buses = busCache.getAllBuses();
    }
    
    const dataString = JSON.stringify(buses);
    const hash = crypto.createHash('md5').update(dataString).digest('hex');
    
    if (req.headers['if-none-match'] === hash) {
        return res.status(304).end();
    }
    
    res.setHeader('ETag', hash);
    res.json(buses);
});

module.exports = router;

