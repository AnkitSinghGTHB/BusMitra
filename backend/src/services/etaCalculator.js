const path = require('path');
const haversine = require('../utils/haversine');
const busCache = require('./busCache');

let routes = [];
let stops = [];
let delaysData = [];
let gtfsData = [];

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
try { routes = require(path.join(dataDir, 'routes.json')); } catch(e) {}
try { stops = require(path.join(dataDir, 'stops.json')); } catch(e) {}
try { delaysData = require(path.join(dataDir, 'delays.json')); } catch(e) {}
try { gtfsData = require(path.join(dataDir, 'gtfs.json')); } catch(e) {}

const defaultDelays = [
    { id: 'd1', routeId: 'M1', lat: 30.8100, lng: 75.1480, avgDelay: 7, probability: 0.6, name: "Railway Crossing" },
    { id: 'd2', routeId: 'M1', lat: 30.8145, lng: 75.1680, avgDelay: 5, probability: 0.4, name: "Bhagwan Chowk Driver Break" }
];
const delays = delaysData.length ? delaysData : defaultDelays;

function snapToRoute(lat, lng, polyline) {
    if (!polyline || polyline.length === 0) return 0;
    let minDist = Infinity;
    let minIdx = 0;
    polyline.forEach((pt, idx) => {
        const dist = haversine(lat, lng, pt.lat, pt.lng);
        if (dist < minDist) {
            minDist = dist;
            minIdx = idx;
        }
    });
    return minIdx;
}

function calculateRouteDistance(busLat, busLng, stopLat, stopLng, polyline) {
    if (!polyline || polyline.length === 0) return haversine(busLat, busLng, stopLat, stopLng);
    const busIdx = snapToRoute(busLat, busLng, polyline);
    const stopIdx = snapToRoute(stopLat, stopLng, polyline);
    
    if (busIdx >= stopIdx) {
        return 0;
    }
    
    let dist = 0;
    for (let i = busIdx; i < stopIdx; i++) {
        dist += haversine(polyline[i].lat, polyline[i].lng, polyline[i+1].lat, polyline[i+1].lng);
    }
    return dist;
}

function calculateConfidence(dataSource, lastUpdateAge, speedVariance = 5) {
    let conf = 100;
    if (dataSource === 'live_gps') conf -= 0;
    else if (dataSource === 'consensus') conf -= 20;
    else if (dataSource === 'gtfs') conf -= 50;
    
    const decay = Math.min(40, lastUpdateAge * 0.67);
    conf -= decay;
    
    if (speedVariance > 15) conf -= 15;
    else if (speedVariance > 10) conf -= 8;
    else if (speedVariance < 3) conf += 2;
    
    const hour = new Date().getHours();
    if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 19)) {
        conf -= 10;
    }
    
    return Math.max(10, Math.min(100, Math.round(conf)));
}

function calculateGTFSETA(routeId, stopId) {
    if (!gtfsData || gtfsData.length === 0) return null;
    
    const stopEntries = gtfsData.filter(e => e.routeId === routeId && e.stopId === stopId);
    if (stopEntries.length === 0) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const parsedEntries = stopEntries.map(e => {
        const timeStr = e.arrivalTime || e.departureTime || '00:00';
        const [h, m] = timeStr.split(':').map(Number);
        return { ...e, minutesOfDay: h * 60 + m, formattedTime: timeStr };
    }).sort((a, b) => a.minutesOfDay - b.minutesOfDay);

    // Find next upcoming trip today
    const upcoming = parsedEntries.find(e => e.minutesOfDay >= currentMinutes);

    let diffMinutes = 0;
    let scheduledTime = '';

    if (upcoming) {
        diffMinutes = upcoming.minutesOfDay - currentMinutes;
        scheduledTime = upcoming.formattedTime;
    } else {
        // Next day earliest trip
        const earliest = parsedEntries[0];
        diffMinutes = (24 * 60 - currentMinutes) + earliest.minutesOfDay;
        scheduledTime = `${earliest.formattedTime} (Tomorrow)`;
    }

    const min = Math.max(1, diffMinutes);
    const max = Math.max(min + 2, diffMinutes + 5);

    return {
        min,
        max,
        confidence: 35,
        source: 'gtfs',
        scheduledTime,
        distance: 0,
        passed: false,
        message: `Scheduled arrival at ${scheduledTime}`
    };
}

async function calculateETA(busId, stopId) {
    const bus = busCache.getBus(busId);
    if (!bus) return null;
    
    const route = routes.find(r => r.id === bus.routeId) || { polyline: [] };
    const stop = stops.find(s => s.id === stopId) || { lat: 30.0, lng: 75.0 };
    
    // If status is scheduled or gtfs, calculate ETA from real GTFS timetable
    if (bus.status === 'scheduled' || bus.status === 'gtfs') {
        const gtfsEta = calculateGTFSETA(bus.routeId, stopId);
        if (gtfsEta) {
            return gtfsEta;
        }
    }

    // Polyline check for passed stop
    if (route.polyline && route.polyline.length > 0) {
        const busIdx = snapToRoute(bus.lat, bus.lng, route.polyline);
        const stopIdx = snapToRoute(stop.lat, stop.lng, route.polyline);
        const directDist = haversine(bus.lat, bus.lng, stop.lat, stop.lng);

        if (busIdx > stopIdx || (busIdx === stopIdx && directDist > 0.2 && busIdx > 0)) {
            return {
                min: 0,
                max: 0,
                confidence: 0,
                source: bus.status,
                passed: true,
                distance: 0,
                message: 'Bus has already passed this stop'
            };
        }
    }

    const distance = calculateRouteDistance(bus.lat, bus.lng, stop.lat, stop.lng, route.polyline);
    const baseSpeed = bus.speed > 0 ? bus.speed : 20;
    const baseETA = (distance / baseSpeed) * 60;
    
    let expectedDelay = 0;
    delays.filter(d => d.routeId === bus.routeId).forEach(d => {
        const dIdx = snapToRoute(d.lat, d.lng, route.polyline);
        const bIdx = snapToRoute(bus.lat, bus.lng, route.polyline);
        const sIdx = snapToRoute(stop.lat, stop.lng, route.polyline);
        if (dIdx >= bIdx && dIdx <= sIdx) {
            const delayMin = d.avgDelay || d.avgDelayMinutes || 0;
            expectedDelay += delayMin * d.probability;
        }
    });

    const ageSeconds = (Date.now() - bus.lastUpdate) / 1000;
    const dataSource = bus.status === 'live' ? 'live_gps' : (bus.status === 'crowd_restored' ? 'consensus' : 'gtfs');
    const speedVariance = busCache.getSpeedVariance ? busCache.getSpeedVariance(busId) : 5;
    const confidence = calculateConfidence(dataSource, ageSeconds, speedVariance);

    let min, max, source;
    try {
        const d = new Date();
        const time_of_day = d.getHours() + d.getMinutes() / 60;
        const day_of_week = d.getDay();
        const mlUrl = `http://ml_service:8000/predict-eta?segment_id=${bus.routeId}_${stopId}&time_of_day=${time_of_day}&day_of_week=${day_of_week}&weather=clear&cumulative_delay=${expectedDelay}`;
        const mlRes = await fetch(mlUrl);
        if (!mlRes.ok) throw new Error('ML service failed');
        const mlData = await mlRes.json();
        
        min = Math.max(1, Math.ceil(mlData.eta_min));
        max = Math.max(min + 1, Math.ceil(mlData.eta_max));
        source = 'ml_predicted';
    } catch (e) {
        // Fallback to offline heuristic
        let minLocal = Math.max(1, Math.ceil(baseETA));
        try {
            // Also attempt localhost if ml_service name fails locally
            const d = new Date();
            const mlUrlLocal = `http://localhost:8000/predict-eta?segment_id=${bus.routeId}_${stopId}&time_of_day=${d.getHours()}&day_of_week=${d.getDay()}&weather=clear&cumulative_delay=${expectedDelay}`;
            const mlResLocal = await fetch(mlUrlLocal);
            if (!mlResLocal.ok) throw new Error('Local ML service failed');
            const mlDataLocal = await mlResLocal.json();
            
            min = Math.max(1, Math.ceil(mlDataLocal.eta_min));
            max = Math.max(min + 1, Math.ceil(mlDataLocal.eta_max));
            source = 'ml_predicted_local';
        } catch(err) {
            min = minLocal;
            max = Math.max(min + 1, Math.ceil(baseETA + expectedDelay + baseETA * 0.3));
            source = bus.status;
        }
    }
    
    return { min, max, confidence, source, distance, passed: false };
}

module.exports = {
    snapToRoute,
    calculateRouteDistance,
    calculateConfidence,
    calculateGTFSETA,
    calculateETA
};
