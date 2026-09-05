const haversine = require('../utils/haversine');

const OSRM_URL = 'https://router.project-osrm.org';

/**
 * Fetches real road geometry between two or more coordinates.
 * @param {Array<{lat: number, lng: number}>} waypoints 
 * @returns {Promise<{polyline: Array<{lat: number, lng: number}>, distance: number, duration: number}>}
 */
async function getRouteGeometry(waypoints) {
    if (waypoints.length < 2) return null;
    
    // OSRM expects coordinates in lng,lat format
    const coordinates = waypoints.map(pt => `${pt.lng},${pt.lat}`).join(';');
    const url = `${OSRM_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null;

        const route = data.routes[0];
        const polyline = route.geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
        }));

        return {
            polyline,
            distance: route.distance, // in meters
            duration: route.duration  // in seconds
        };
    } catch (err) {
        console.error('OSRM routing error:', err);
        return null;
    }
}

/**
 * Snaps a coordinate to the nearest road.
 */
async function snapToRoad(lat, lng) {
    const url = `${OSRM_URL}/nearest/v1/driving/${lng},${lat}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return { lat, lng, snapped: false };
        const data = await res.json();
        
        if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
            const pt = data.waypoints[0];
            return {
                lat: pt.location[1],
                lng: pt.location[0],
                name: pt.name,
                distance: pt.distance,
                snapped: true
            };
        }
    } catch(err) {
        // ignore
    }
    return { lat, lng, snapped: false };
}

/**
 * Gets walking route ETA/Distance
 */
async function getWalkingRoute(startLat, startLng, endLat, endLng) {
    const url = `${OSRM_URL}/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=false`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            // Fallback to straight line distance at 5 km/h
            const distKm = haversine(startLat, startLng, endLat, endLng);
            return { distance: distKm * 1000, duration: (distKm / 5) * 3600 };
        }
        const data = await res.json();
        if (data.code === 'Ok' && data.routes.length > 0) {
            return {
                distance: data.routes[0].distance,
                duration: data.routes[0].duration
            };
        }
    } catch (err) {}
    
    // Fallback
    const distKm = haversine(startLat, startLng, endLat, endLng);
    return { distance: distKm * 1000, duration: (distKm / 5) * 3600 };
}

module.exports = {
    getRouteGeometry,
    snapToRoad,
    getWalkingRoute
};
