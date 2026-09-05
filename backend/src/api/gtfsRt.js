const router = require('express').Router();
const busCache = require('../services/busCache');
const { calculateETA } = require('../services/etaCalculator');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let stops = [];
try { stops = require(path.join(dataDir, 'stops.json')); } catch(e) {}

function mapOccupancyToGTFS(tier) {
    switch ((tier || '').toLowerCase()) {
        case 'empty':
            return 'MANY_SEATS_AVAILABLE';
        case 'seated':
            return 'FEW_SEATS_AVAILABLE';
        case 'crowded':
            return 'STANDING_ROOM_ONLY';
        default:
            return 'NO_DATA_AVAILABLE';
    }
}

// 1. Vehicle Positions Feed (GTFS-RT)
router.get('/vehicle-positions', (req, res) => {
    const buses = busCache.getAllBuses();
    const nowSec = Math.floor(Date.now() / 1000);

    const entities = buses.map(bus => ({
        id: `vp_${bus.busId}`,
        isDeleted: false,
        vehicle: {
            trip: {
                tripId: `trip_${bus.busId}`,
                routeId: bus.routeId || 'M1',
                scheduleRelationship: bus.status === 'scheduled' ? 'SCHEDULED' : 'ADDED'
            },
            position: {
                latitude: bus.lat,
                longitude: bus.lng,
                bearing: bus.heading || 0,
                speed: (bus.speed || 0) / 3.6 // convert km/h to m/s for GTFS spec
            },
            currentStatus: bus.speed > 0 ? 'IN_TRANSIT_TO' : 'STOPPED_AT',
            timestamp: Math.floor((bus.lastUpdate || Date.now()) / 1000),
            occupancyStatus: mapOccupancyToGTFS(bus.occupancy_tier),
            congestionLevel: bus.status === 'off_route' ? 'RUNNING_SLIGHTLY_DELAYED' : 'UNKNOWN_CONGESTION_LEVEL'
        }
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json({
        header: {
            gtfsRealtimeVersion: '2.0',
            incrementality: 'FULL_DATASET',
            timestamp: nowSec
        },
        entity: entities
    });
});

// 2. Trip Updates Feed (GTFS-RT)
router.get('/trip-updates', async (req, res) => {
    const buses = busCache.getAllBuses();
    const nowSec = Math.floor(Date.now() / 1000);

    const entities = await Promise.all(buses.map(async bus => {
        // Calculate stop time updates for upcoming stops
        const routeStops = stops.filter(s => !s.routeId || s.routeId === (bus.routeId || 'M1'));
        const stopTimeUpdates = [];

        for (let s of routeStops) {
            try {
                const eta = await calculateETA(bus.busId, s.id);
                if (eta && !eta.passed) {
                    const arrivalTimeSec = nowSec + (eta.min * 60);
                    stopTimeUpdates.push({
                        stopSequence: s.order || 1,
                        stopId: s.id,
                        arrival: {
                            delay: (eta.max - eta.min) * 60,
                            time: arrivalTimeSec,
                            uncertainty: Math.round((100 - (eta.confidence || 80)) * 6)
                        },
                        scheduleRelationship: 'SCHEDULED'
                    });
                }
            } catch(e) {}
        }

        return {
            id: `tu_${bus.busId}`,
            isDeleted: false,
            tripUpdate: {
                trip: {
                    tripId: `trip_${bus.busId}`,
                    routeId: bus.routeId || 'M1'
                },
                vehicle: {
                    id: bus.busId
                },
                stopTimeUpdate: stopTimeUpdates,
                timestamp: nowSec
            }
        };
    }));

    res.setHeader('Content-Type', 'application/json');
    res.json({
        header: {
            gtfsRealtimeVersion: '2.0',
            incrementality: 'FULL_DATASET',
            timestamp: nowSec
        },
        entity: entities
    });
});

// 3. Alerts Feed (GTFS-RT)
router.get('/alerts', (req, res) => {
    const buses = busCache.getAllBuses();
    const nowSec = Math.floor(Date.now() / 1000);
    const entities = [];

    buses.forEach(bus => {
        if (bus.status === 'off_route') {
            entities.push({
                id: `alert_offroute_${bus.busId}`,
                alert: {
                    activePeriod: [{ start: nowSec, end: nowSec + 1800 }],
                    informedEntity: [{ routeId: bus.routeId || 'M1' }],
                    cause: 'DETOUR',
                    effect: 'SIGNIFICANT_DELAYS',
                    headerText: {
                        translation: [
                            { text: `Bus ${bus.busId} Off-Route Alert`, language: 'en' },
                            { text: `बस ${bus.busId} निर्धारित मार्ग से विचलित`, language: 'hi' }
                        ]
                    },
                    descriptionText: {
                        translation: [
                            { text: 'Bus detected deviating from standard corridor. Downstream arrival times may be delayed.', language: 'en' }
                        ]
                    }
                }
            });
        }
    });

    res.setHeader('Content-Type', 'application/json');
    res.json({
        header: {
            gtfsRealtimeVersion: '2.0',
            incrementality: 'FULL_DATASET',
            timestamp: nowSec
        },
        entity: entities
    });
});

module.exports = router;
