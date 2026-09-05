const path = require('path');
const router = require('express').Router();
const busCache = require('../services/busCache');
const etaCalculator = require('../services/etaCalculator');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let gtfsData = [];
try { gtfsData = require(path.join(dataDir, 'gtfs.json')); } catch(e) {}
let stops = [];
try { stops = require(path.join(dataDir, 'stops.json')); } catch(e) {}
let routes = [];
try { routes = require(path.join(dataDir, 'routes.json')); } catch(e) {}

router.post('/', async (req, res) => {
    const { from, body } = req.body;
    
    if (!body || typeof body !== 'string') {
        return res.json({ reply: 'Invalid format. Send "BUS <ROUTE>" (e.g. "BUS M1") or "BUS <ROUTE> <STOP>" (e.g. "BUS M1 HOSPITAL").' });
    }
    
    // Support "BUS M1", "BUS RJ-01", "BUS M1 HOSPITAL", "BUS M1 S4"
    const match = body.trim().match(/^BUS\s+([a-zA-Z0-9_-]+)(?:\s+(.+))?$/i);
    if (!match) {
        return res.json({ reply: 'Invalid format. Send "BUS <ROUTE>" (e.g. "BUS M1") or "BUS <ROUTE> <STOP>" (e.g. "BUS M1 HOSPITAL").' });
    }
    
    const routeId = match[1].toUpperCase();
    const stopQuery = match[2] ? match[2].trim() : null;

    const route = routes.find(r => r.id === routeId) || { polyline: [] };
    const routeStops = stops.filter(s => s.routeId === routeId);
    const availableStops = routeStops.length > 0 ? routeStops : stops;

    if (availableStops.length === 0) {
        return res.json({ reply: `No stop data available for route ${routeId}.` });
    }

    let targetStop = null;

    if (stopQuery) {
        const queryLower = stopQuery.toLowerCase();
        // Exact match on stop ID (e.g. "S1", "S4")
        targetStop = availableStops.find(s => s.id.toLowerCase() === queryLower);
        // Or substring match on stop name (e.g. "hospital", "chowk")
        if (!targetStop) {
            targetStop = availableStops.find(s => s.name.toLowerCase().includes(queryLower));
        }

        if (!targetStop) {
            const stopNames = availableStops.map(s => s.name).join(', ');
            return res.json({ reply: `Stop "${stopQuery}" not found on route ${routeId}. Valid stops: ${stopNames}` });
        }
    }

    const bus = busCache.getBusByRoute(routeId);

    // If no stop was explicitly requested, pick the next stop ahead of current bus position
    if (!targetStop) {
        if (bus && bus.lat && bus.lng && route.polyline && route.polyline.length > 0) {
            const busIdx = etaCalculator.snapToRoute(bus.lat, bus.lng, route.polyline);
            
            // Find stops ahead of the bus
            const aheadStops = availableStops
                .map(s => ({
                    ...s,
                    stopIdx: etaCalculator.snapToRoute(s.lat, s.lng, route.polyline)
                }))
                .filter(s => s.stopIdx > busIdx)
                .sort((a, b) => a.stopIdx - b.stopIdx);

            if (aheadStops.length > 0) {
                targetStop = aheadStops[0];
            } else {
                // Bus has passed all stops
                const lastStop = availableStops[availableStops.length - 1];
                return res.json({
                    reply: `Bus ${routeId} has completed its route to ${lastStop.name}. Check scheduled trips for next departure.`
                });
            }
        } else {
            // Default to the first stop if bus position is unknown
            targetStop = availableStops[0];
        }
    }

    // CASE 1: Bus is active in cache
    if (bus) {
        const eta = await etaCalculator.calculateETA(bus.busId, targetStop.id);
        if (eta) {
            if (eta.passed) {
                // Find next upcoming stop ahead
                let nextStopMsg = '';
                if (route.polyline && route.polyline.length > 0) {
                    const busIdx = etaCalculator.snapToRoute(bus.lat, bus.lng, route.polyline);
                    const ahead = availableStops.find(s => etaCalculator.snapToRoute(s.lat, s.lng, route.polyline) > busIdx);
                    if (ahead) {
                        nextStopMsg = ` Next stop ahead is ${ahead.name}.`;
                    }
                }
                return res.json({
                    reply: `Bus ${routeId} has already passed ${targetStop.name}.${nextStopMsg}`
                });
            }

            const statusLabel = bus.status === 'live' ? 'Live GPS' : (bus.status === 'crowd_restored' ? 'Crowd-Restored' : 'Scheduled');
            return res.json({
                reply: `Bus ${routeId} arriving at ${targetStop.name} in ${eta.min}-${eta.max} min. Confidence: ${eta.confidence}% (${statusLabel})`
            });
        }
    }

    // CASE 2: No active bus in cache — Fall back to GTFS timetable WITHOUT mutating cache (Issue #13 fix!)
    const gtfsEta = etaCalculator.calculateGTFSETA(routeId, targetStop.id);
    if (gtfsEta) {
        return res.json({
            reply: `Bus ${routeId} scheduled at ${targetStop.name} in ~${gtfsEta.min}-${gtfsEta.max} min (${gtfsEta.scheduledTime}). Confidence: ${gtfsEta.confidence}% (Scheduled Timetable)`
        });
    }

    res.json({ reply: `No live bus or schedule available for route ${routeId} at ${targetStop.name}.` });
});

module.exports = router;
