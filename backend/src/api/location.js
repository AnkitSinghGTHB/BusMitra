const router = require('express').Router();
const busCache = require('../services/busCache');
const dbService = require('../services/db');
const driverAuth = require('../middleware/driverAuth');

const path = require('path');
const haversine = require('../utils/haversine');
const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let routes = [];
try { routes = require(path.join(dataDir, 'routes.json')); } catch(e) {}

const ML_PRIMARY = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const ML_DOCKER = 'http://ml_service:8000';

// Helper to query ML service with dual-endpoint fallback
async function callMLService(endpoint, options = {}) {
    try {
        const res = await fetch(`${ML_PRIMARY}${endpoint}`, options);
        if (res.ok) return await res.json();
    } catch (e) {
        // Retry with Docker network hostname if running inside container
        try {
            const resDocker = await fetch(`${ML_DOCKER}${endpoint}`, options);
            if (resDocker.ok) return await resDocker.json();
        } catch (err) {}
    }
    return null;
}

// Calculate cross track distance & snap to route if within corridor tolerance
function matchToCorridor(lat, lng, polyline) {
    if (!polyline || polyline.length === 0) {
        return { matchedLat: lat, matchedLng: lng, crossTrackDistKm: 0, snapped: false };
    }

    let minDist = Infinity;
    let closestPoint = { lat, lng };

    for (let pt of polyline) {
        const dist = haversine(lat, lng, pt.lat, pt.lng);
        if (dist < minDist) {
            minDist = dist;
            closestPoint = pt;
        }
    }

    // 50m tolerance corridor (0.05 km)
    // If within 50m, snap coordinates to corridor centerline to eliminate GPS multi-path jitter
    if (minDist <= 0.05) {
        return {
            matchedLat: closestPoint.lat,
            matchedLng: closestPoint.lng,
            crossTrackDistKm: minDist,
            snapped: true
        };
    }

    // Between 50m and 150m: curbside informal boarding, preserve raw coordinates without snapping
    return {
        matchedLat: lat,
        matchedLng: lng,
        crossTrackDistKm: minDist,
        snapped: false
    };
}

// Check depot geofence (Moga Bus Stand) for auto-activating trips
function checkGeofenceAutoTrigger(bus, lat, lng, speed) {
    const DEPOT_LAT = 30.8163;
    const DEPOT_LNG = 75.1720;
    const distFromDepot = haversine(lat, lng, DEPOT_LAT, DEPOT_LNG);

    // If bus is idle/scheduled, leaving depot (> 120m) with sustained speed (> 15 km/h) -> Auto-activate
    if ((!bus.status || bus.status === 'scheduled' || bus.status === 'offline') && distFromDepot > 0.12 && speed >= 15) {
        return 'live';
    }
    return bus.status || 'live';
}

// Process a single telemetry update point
async function processLocationPoint(point, existingBus = null) {
    const { busId, lat, lng, speed = 0, heading = 0, timestamp } = point;
    const ble_count = point.ble_count !== undefined ? point.ble_count : point.bleCount;
    const bus = existingBus || busCache.getBus(busId) || {};
    const routeId = bus.routeId || (busId.startsWith('M') ? busId : 'M1');
    const route = routes.find(r => r.id === routeId) || { polyline: [] };

    // 1. Anchor-Point Corridor Matching & Jitter Filtering
    const { matchedLat, matchedLng, crossTrackDistKm, snapped } = matchToCorridor(lat, lng, route.polyline);

    // 2. Geofence Auto-Trigger
    let status = checkGeofenceAutoTrigger(bus, lat, lng, speed);
    let anomaly_counter = bus.anomaly_counter || 0;

    // 3. Trajectory Anomaly & Route Deviation Detection (ML + Guardrails)
    const anomalyPayload = {
        bus_id: busId,
        lat,
        lon: lng,
        speed,
        heading,
        cross_track_distance: crossTrackDistKm,
        timestamp: timestamp || new Date().toISOString()
    };

    const mlAnomaly = await callMLService('/detect-anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(anomalyPayload)
    });

    if (mlAnomaly && mlAnomaly.is_anomaly) {
        anomaly_counter++;
        if (anomaly_counter >= 3) {
            status = 'off_route';
        }
    } else if (crossTrackDistKm > 0.18) {
        // Deterministic fallback: > 180m off corridor for 3 pings
        anomaly_counter++;
        if (anomaly_counter >= 3) {
            status = 'off_route';
        }
    } else {
        anomaly_counter = 0;
        if (status === 'off_route') status = 'live'; // recovered back onto corridor
    }

    // 4. Passive Occupancy Estimation (BLE Sensing)
    let occupancy_tier = bus.occupancy_tier || 'empty';
    if (ble_count !== undefined) {
        const occData = await callMLService(`/predict-occupancy?ble_count=${ble_count}&bus_id=${busId}`);
        if (occData && occData.occupancy_tier) {
            occupancy_tier = occData.occupancy_tier;
        } else {
            if (ble_count < 15) occupancy_tier = 'empty';
            else if (ble_count <= 38) occupancy_tier = 'seated';
            else occupancy_tier = 'crowded';
        }
    }

    const updatedData = {
        lat: matchedLat,
        lng: matchedLng,
        rawLat: lat,
        rawLng: lng,
        speed: speed || 0,
        heading: heading || 0,
        status,
        anomaly_counter,
        ble_count: ble_count !== undefined ? ble_count : bus.ble_count,
        occupancy_tier,
        cross_track_km: round(crossTrackDistKm, 3),
        snapped_to_corridor: snapped,
        lastUpdate: Date.now()
    };

    busCache.updateBus(busId, updatedData);
    return busCache.getBus(busId);
}

function round(val, decimals = 2) {
    return Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
}

// Single Location Update Endpoint
router.post('/', driverAuth, async (req, res) => {
    const { busId, lat, lng, speed, heading, ble_count, bleCount, timestamp } = req.body;
    const ble = ble_count !== undefined ? ble_count : bleCount;
    
    if (!busId || lat === undefined || lng === undefined) {
        return res.status(400).json({ error: 'Missing parameters: busId, lat, and lng are required' });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Coordinates must be valid numbers' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: 'Coordinates out of range (-90 to 90 lat, -180 to 180 lng)' });
    }

    if (speed !== undefined && (typeof speed !== 'number' || isNaN(speed) || speed < 0 || speed > 140)) {
        return res.status(400).json({ error: 'Invalid speed: must be a number between 0 and 140 km/h' });
    }

    const updatedBus = await processLocationPoint({ busId, lat, lng, speed, heading, ble_count: ble, timestamp });
    
    const io = req.app.get('io');
    if (io) {
        io.emit('bus_update', updatedBus);
    }
    
    dbService.syncBus(updatedBus).catch(() => {});
    
    res.json({
        success: true,
        status: updatedBus.status,
        snapped: updatedBus.snapped_to_corridor,
        cross_track_km: updatedBus.cross_track_km,
        occupancy_tier: updatedBus.occupancy_tier
    });
});

// Store-and-Forward Batch Ingestion Endpoint (Network Reconnection from Dead Zones)
router.post('/batch', driverAuth, async (req, res) => {
    const { busId, updates } = req.body;

    if (!busId || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Valid busId and non-empty updates array are required' });
    }

    let latestBus = null;
    let processedCount = 0;

    for (let pt of updates) {
        if (typeof pt.lat === 'number' && typeof pt.lng === 'number') {
            latestBus = await processLocationPoint({
                busId,
                lat: pt.lat,
                lng: pt.lng,
                speed: pt.speed || 0,
                heading: pt.heading || 0,
                ble_count: pt.ble_count !== undefined ? pt.ble_count : pt.bleCount,
                timestamp: pt.timestamp
            }, latestBus);
            processedCount++;
        }
    }

    if (latestBus) {
        const io = req.app.get('io');
        if (io) {
            io.emit('bus_update', latestBus);
        }
        dbService.syncBus(latestBus).catch(() => {});
    }

    res.json({
        success: true,
        batch_processed: processedCount,
        latest_status: latestBus ? latestBus.status : 'unknown'
    });
});

module.exports = router;
