const router = require('express').Router();
const busCache = require('../services/busCache');
const dbService = require('../services/db');
const driverAuth = require('../middleware/driverAuth');

const path = require('path');
const haversine = require('../utils/haversine');
const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let routes = [];
try { routes = require(path.join(dataDir, 'routes.json')); } catch(e) {}

router.post('/', driverAuth, async (req, res) => {
    const { busId, lat, lng, speed, heading, ble_count } = req.body;
    
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
    
    const bus = busCache.getBus(busId) || {};
    const routeId = bus.routeId || (busId.startsWith('M') ? busId : 'M1');
    const route = routes.find(r => r.id === routeId) || { polyline: [] };
    
    let cross_track_distance = 0;
    if (route.polyline.length > 0) {
        let minDist = Infinity;
        for (let pt of route.polyline) {
            const dist = haversine(lat, lng, pt.lat, pt.lng);
            if (dist < minDist) minDist = dist;
        }
        cross_track_distance = minDist;
    }
    
    const along_track_velocity = speed || 0;
    let anomaly_counter = bus.anomaly_counter || 0;
    let status = bus.status || 'live';
    
    try {
        const mlRes = await fetch('http://ml_service:8000/detect-anomaly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bus_id: busId,
                lat,
                lon: lng,
                speed: along_track_velocity,
                timestamp: new Date().toISOString()
            })
        });
        if (!mlRes.ok) throw new Error(`ML service failed (${mlRes.status})`);
        const mlData = await mlRes.json();
        if (mlData.is_anomaly) {
            anomaly_counter++;
            if (anomaly_counter >= 3) {
                status = 'off_route';
            }
        } else {
            anomaly_counter = 0;
            if (status === 'off_route') status = 'live'; // recover
        }
    } catch(err) {
        // ML down, fallback to simple distance check
        if (cross_track_distance > 0.5) { // 500m
            anomaly_counter++;
            if (anomaly_counter >= 3) {
                status = 'off_route';
            }
        } else {
            anomaly_counter = 0;
        }
    }
    
    let occupancy_tier = bus.occupancy_tier || 'unknown';
    if (ble_count !== undefined) {
        try {
            const occRes = await fetch(`http://ml_service:8000/predict-occupancy?ble_count=${ble_count}`);
            const occData = await occRes.json();
            occupancy_tier = occData.occupancy_tier;
        } catch(err) {
            if (ble_count < 10) occupancy_tier = 'low';
            else if (ble_count < 30) occupancy_tier = 'medium';
            else occupancy_tier = 'high';
        }
    }

    busCache.updateBus(busId, { lat, lng, speed: speed || 0, heading: heading || 0, status, anomaly_counter, ble_count, occupancy_tier });
    const updatedBus = busCache.getBus(busId);
    
    const io = req.app.get('io');
    if (io) {
        io.emit('bus_update', updatedBus);
    }
    
    // Asynchronously mirror to DB if running
    dbService.syncBus(updatedBus).catch(() => {});
    
    res.json({ success: true });
});

module.exports = router;
