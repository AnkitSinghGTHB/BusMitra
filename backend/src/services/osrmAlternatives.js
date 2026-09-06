/**
 * OSRM Alternatives Service
 * Queries OSRM for alternate routes between two points.
 * Used by the simulation system to let admins pick route variants.
 */

const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Fetch alternate routes from OSRM for a given start and end point.
 * @param {number} startLat
 * @param {number} startLng
 * @param {number} endLat
 * @param {number} endLng
 * @param {number} maxAlternatives - max number of alternatives to request (default 3)
 * @returns {Promise<Array<{polyline: Array<{lat: number, lng: number}>, distanceKm: number, durationMin: number, index: number}>>}
 */
async function fetchAlternativeRoutes(startLat, startLng, endLat, endLng, maxAlternatives = 3) {
    const url = `${OSRM_BASE}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=${maxAlternatives}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`[OSRM] HTTP ${res.status} from OSRM`);
            return [];
        }

        const data = await res.json();
        if (!data.routes || data.routes.length === 0) {
            return [];
        }

        return data.routes.map((route, index) => ({
            index,
            polyline: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
            distanceKm: Math.round((route.distance / 1000) * 100) / 100,
            durationMin: Math.round((route.duration / 60) * 10) / 10,
            pointCount: route.geometry.coordinates.length
        }));
    } catch (err) {
        console.error('[OSRM] Failed to fetch alternatives:', err.message);
        return [];
    }
}

/**
 * Get alternatives for a specific route from routes.json data.
 * Extracts first and last polyline points as origin/destination.
 * @param {object} route - Route object with .polyline array
 * @returns {Promise<Array>}
 */
async function getAlternativesForRoute(route) {
    if (!route || !route.polyline || route.polyline.length < 2) {
        return [];
    }

    const first = route.polyline[0];
    const last = route.polyline[route.polyline.length - 1];

    return fetchAlternativeRoutes(first.lat, first.lng, last.lat, last.lng);
}

module.exports = {
    fetchAlternativeRoutes,
    getAlternativesForRoute
};
