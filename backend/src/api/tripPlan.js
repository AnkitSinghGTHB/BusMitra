const router = require('express').Router();
const path = require('path');
const haversine = require('../utils/haversine');
const busCache = require('../services/busCache');
const etaCalculator = require('../services/etaCalculator');
const osrmRouter = require('../services/osrmRouter');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let routes = [];
let stops = [];

try { routes = require(path.join(dataDir, 'routes.json')); } catch(e) {}
try { stops = require(path.join(dataDir, 'stops.json')); } catch(e) {}

// POST /api/trip-plan
router.post('/', async (req, res) => {
    const { startLat, startLng, endLat, endLng } = req.body;

    if (!startLat || !startLng || !endLat || !endLng) {
        return res.status(400).json({ error: 'Missing start or end coordinates' });
    }

    const MAX_WALK_DISTANCE_KM = 50.0;

    // 1. Find potential routes
    const candidateRoutes = [];

    for (const route of routes) {
        const routeStops = stops.filter(s => s.routeId === route.id).sort((a, b) => a.order - b.order);
        if (routeStops.length < 2) continue;

        // Find nearest boarding stop
        let bestBoardingStop = null;
        let minBoardingDist = Infinity;
        
        // Find nearest alighting stop
        let bestAlightingStop = null;
        let minAlightingDist = Infinity;

        for (let i = 0; i < routeStops.length; i++) {
            const stop = routeStops[i];
            
            // Check boarding
            const startDist = haversine(startLat, startLng, stop.lat, stop.lng);
            if (startDist < minBoardingDist && startDist <= MAX_WALK_DISTANCE_KM) {
                minBoardingDist = startDist;
                bestBoardingStop = { ...stop, index: i, walkDistKm: startDist };
            }

            // Check alighting
            const endDist = haversine(endLat, endLng, stop.lat, stop.lng);
            if (endDist < minAlightingDist && endDist <= MAX_WALK_DISTANCE_KM) {
                minAlightingDist = endDist;
                bestAlightingStop = { ...stop, index: i, walkDistKm: endDist };
            }
        }

        // Support bidirectional travel on the route
        if (bestBoardingStop && bestAlightingStop && bestBoardingStop.index !== bestAlightingStop.index) {
            candidateRoutes.push({
                route,
                boardingStop: bestBoardingStop,
                alightingStop: bestAlightingStop
            });
        }
    }

    if (candidateRoutes.length === 0) {
        return res.json({ routes: [] });
    }

    const results = [];

    for (const match of candidateRoutes) {
        const { route, boardingStop, alightingStop } = match;

        // Walk 1 (Start to Boarding Stop)
        const walk1 = await osrmRouter.getWalkingRoute(startLat, startLng, boardingStop.lat, boardingStop.lng);
        
        // Walk 2 (Alighting Stop to End)
        const walk2 = await osrmRouter.getWalkingRoute(alightingStop.lat, alightingStop.lng, endLat, endLng);

        // Find active buses for this route
        const activeBuses = busCache.getAllBuses().filter(b => b.routeId === route.id);
        
        // Find the next arriving bus or use scheduled
        let bestBusETA = null;
        let selectedBus = null;

        if (activeBuses.length > 0) {
            for (const bus of activeBuses) {
                const eta = await etaCalculator.calculateETA(bus.busId, boardingStop.id);
                if (eta && !eta.passed && (!bestBusETA || eta.min < bestBusETA.min)) {
                    bestBusETA = eta;
                    selectedBus = bus;
                }
            }
        }

        if (!bestBusETA) {
            bestBusETA = etaCalculator.calculateGTFSETA(route.id, boardingStop.id);
        }

        // Bus travel time between boarding and alighting stop
        // We can approximate by getting ETA from current bus to alighting stop and subtracting,
        // or just use distance / average speed.
        const rideDistKm = etaCalculator.calculateRouteDistance(boardingStop.lat, boardingStop.lng, alightingStop.lat, alightingStop.lng, route.polyline);
        const rideMin = Math.max(1, Math.ceil((rideDistKm / 25) * 60)); // Assumes 25km/h avg

        if (bestBusETA) {
            const totalDurationMin = Math.ceil(walk1.duration / 60) + bestBusETA.min + rideMin + Math.ceil(walk2.duration / 60);

            results.push({
                routeId: route.id,
                routeName: route.name,
                routeCode: route.code || route.id,
                busId: selectedBus ? selectedBus.busId : null,
                status: selectedBus ? selectedBus.status : 'scheduled',
                occupancy_tier: selectedBus ? selectedBus.occupancy_tier : 'unknown',
                confidence: bestBusETA.confidence,
                
                walkToStopMin: Math.ceil(walk1.duration / 60),
                walkToStopDistM: Math.round(walk1.distance),
                boardingStopName: boardingStop.name,
                
                busWaitMin: bestBusETA.min,
                busWaitMax: bestBusETA.max,
                
                busRideMin: rideMin,
                alightingStopName: alightingStop.name,

                walkToDestMin: Math.ceil(walk2.duration / 60),
                walkToDestDistM: Math.round(walk2.distance),
                
                totalDurationMin,
                
                polyline: route.polyline // Include so frontend can draw it
            });
        }
    }

    // Sort by total duration
    results.sort((a, b) => a.totalDurationMin - b.totalDurationMin);

    res.json({ routes: results });
});

module.exports = router;
