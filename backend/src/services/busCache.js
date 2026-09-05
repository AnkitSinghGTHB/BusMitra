const buses = new Map();

function updateBus(busId, data) {
    const existing = buses.get(busId) || {};
    
    // Track speed history (last 5 readings) for dynamic variance computation
    let speedHistory = Array.isArray(existing.speedHistory) ? [...existing.speedHistory] : [];
    if (data.speed !== undefined && typeof data.speed === 'number') {
        speedHistory.push(data.speed);
        if (speedHistory.length > 5) {
            speedHistory.shift();
        }
    }

    const updated = {
        ...existing,
        ...data,
        busId,
        speedHistory,
        lastUpdate: Date.now(),
        status: data.status || existing.status || 'live'
    };

    buses.set(busId, updated);
}

function getBus(busId) {
    const bus = buses.get(busId);
    if (!bus) return null;
    // Return a shallow copy so external callers cannot mutate internal state
    return { ...bus };
}

function getAllBuses() {
    const all = [];
    const now = Date.now();
    for (const [busId, bus] of buses.entries()) {
        // Exclude inactive buses or buses with no updates for over 15 minutes
        if (bus.status !== 'inactive' && bus.status !== 'completed' && (now - bus.lastUpdate <= 15 * 60 * 1000)) {
            all.push({ ...bus });
        }
    }
    return all;
}

function removeBus(busId) {
    buses.delete(busId);
}

function getBusByRoute(routeId) {
    const now = Date.now();
    for (const [busId, bus] of buses.entries()) {
        if (bus.routeId === routeId && bus.status !== 'inactive' && bus.status !== 'completed' && (now - bus.lastUpdate <= 15 * 60 * 1000)) {
            return { ...bus };
        }
    }
    return null;
}

function getSpeedVariance(busId) {
    const bus = buses.get(busId);
    if (!bus || !bus.speedHistory || bus.speedHistory.length < 2) {
        return 5; // sensible baseline
    }
    const speeds = bus.speedHistory;
    const mean = speeds.reduce((acc, val) => acc + val, 0) / speeds.length;
    const squareDiffs = speeds.map(s => Math.pow(s - mean, 2));
    const variance = squareDiffs.reduce((acc, val) => acc + val, 0) / speeds.length;
    return Math.sqrt(variance); // Standard deviation
}

function pruneStaleBuses(maxAgeMs = 15 * 60 * 1000) {
    const now = Date.now();
    for (const [busId, bus] of buses.entries()) {
        if (now - bus.lastUpdate > maxAgeMs) {
            buses.delete(busId);
        }
    }
}

module.exports = {
    updateBus,
    getBus,
    getAllBuses,
    removeBus,
    getBusByRoute,
    getSpeedVariance,
    pruneStaleBuses
};
