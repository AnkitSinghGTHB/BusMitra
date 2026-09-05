const buses = new Map();

function updateBus(busId, data) {
    const existing = buses.get(busId) || {};
    buses.set(busId, { ...existing, ...data, busId, lastUpdate: Date.now(), status: data.status || 'live' });
}

function getBus(busId) {
    const bus = buses.get(busId);
    if (!bus) return null;
    if (Date.now() - bus.lastUpdate > 60000 && bus.status === 'live') {
        bus.status = 'scheduled';
    }
    return bus;
}

function getAllBuses() {
    const all = [];
    for (const [busId, bus] of buses.entries()) {
        all.push(getBus(busId));
    }
    return all;
}

function removeBus(busId) {
    buses.delete(busId);
}

function getBusByRoute(routeId) {
    for (const [busId, bus] of buses.entries()) {
        const b = getBus(busId);
        if (b && b.routeId === routeId && b.status !== 'inactive') {
            return b;
        }
    }
    return null;
}

module.exports = { updateBus, getBus, getAllBuses, removeBus, getBusByRoute };
