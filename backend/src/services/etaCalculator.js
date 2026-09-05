const path = require('path');
const haversine = require('../utils/haversine');
const busCache = require('./busCache');

let routes = [];
let stops = [];
let delaysData = [];

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
try { routes = require(path.join(dataDir, 'routes.json')); } catch(e) {}
try { stops = require(path.join(dataDir, 'stops.json')); } catch(e) {}
try { delaysData = require(path.join(dataDir, 'delays.json')); } catch(e) {}

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
        return haversine(busLat, busLng, stopLat, stopLng);
    }
    
    let dist = 0;
    for (let i = busIdx; i < stopIdx; i++) {
        dist += haversine(polyline[i].lat, polyline[i].lng, polyline[i+1].lat, polyline[i+1].lng);
    }
    return dist;
}

function calculateConfidence(dataSource, lastUpdateAge, speedVariance) {
    let conf = 100;
    if (dataSource === 'live_gps') conf -= 0;
    else if (dataSource === 'consensus') conf -= 20;
    else if (dataSource === 'gtfs') conf -= 50;
    
    const decay = Math.min(40, lastUpdateAge * 0.67);
    conf -= decay;
    
    if (speedVariance > 15) conf -= 15;
    else if (speedVariance > 10) conf -= 8;
    
    const hour = new Date().getHours();
    if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 19)) {
        conf -= 10;
    }
    
    return Math.max(10, Math.min(100, Math.round(conf)));
}

function calculateETA(busId, stopId) {
    const bus = busCache.getBus(busId);
    if (!bus) return null;
    
    const route = routes.find(r => r.id === bus.routeId) || { polyline: [] };
    const stop = stops.find(s => s.id === stopId) || { lat: 30.0, lng: 75.0 };
    
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
    
    const min = Math.max(1, Math.ceil(baseETA));
    const max = Math.max(min + 1, Math.ceil(baseETA + expectedDelay + baseETA * 0.3));
    
    const ageSeconds = (Date.now() - bus.lastUpdate) / 1000;
    const dataSource = bus.status === 'live' ? 'live_gps' : (bus.status === 'crowd_restored' ? 'consensus' : 'gtfs');
    const confidence = calculateConfidence(dataSource, ageSeconds, 5);
    
    return { min, max, confidence, source: bus.status, distance };
}

module.exports = { snapToRoute, calculateRouteDistance, calculateConfidence, calculateETA };
