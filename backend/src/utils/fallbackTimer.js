function startFallbackTimer(io, busCache) {
    setInterval(() => {
        const buses = busCache.getAllBuses();
        const now = Date.now();
        
        buses.forEach(bus => {
            if (!bus) return;
            
            // Stale after 60s -> degrade to scheduled
            if (bus.status === 'live' && now - bus.lastUpdate > 60000) {
                busCache.updateBus(bus.busId, { status: 'scheduled' });
                if (io) {
                    io.emit('status_change', { busId: bus.busId, status: 'scheduled', source: 'gtfs' });
                }
            }
            // Inactive after 10 minutes without update -> mark inactive
            else if (now - bus.lastUpdate > 10 * 60 * 1000 && bus.status !== 'inactive') {
                busCache.updateBus(bus.busId, { status: 'inactive' });
                if (io) {
                    io.emit('status_change', { busId: bus.busId, status: 'inactive', source: 'offline' });
                }
            }
        });

        // Prune entries older than 15 minutes from memory
        if (busCache.pruneStaleBuses) {
            busCache.pruneStaleBuses(15 * 60 * 1000);
        }
    }, 10000);
}

module.exports = startFallbackTimer;
