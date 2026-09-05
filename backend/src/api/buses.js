const router = require('express').Router();
const busCache = require('../services/busCache');
const crypto = require('crypto');

router.get('/', (req, res) => {
    const buses = busCache.getAllBuses();
    const dataString = JSON.stringify(buses);
    const hash = crypto.createHash('md5').update(dataString).digest('hex');
    
    if (req.headers['if-none-match'] === hash) {
        return res.status(304).end();
    }
    
    res.setHeader('ETag', hash);
    res.json(buses);
});

module.exports = router;
