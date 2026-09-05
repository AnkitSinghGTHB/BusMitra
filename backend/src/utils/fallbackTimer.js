function startFallbackTimer(io, busCache) {
    setInterval(() => {
        const buses = busCache.getAllBuses();
        const now = Date.now();
        buses.forEach(bus => {
            if (bus && bus.status === 'live' && now - bus.lastUpdate > 60000) {
                bus.status = 'scheduled';
                io.emit('status_change', { busId: bus.busId, status: 'scheduled', source: 'gtfs' });
            }
        });
    }, 10000);
}

module.exports = startFallbackTimer;
