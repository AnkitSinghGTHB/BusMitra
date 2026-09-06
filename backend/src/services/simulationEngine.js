/**
 * BusMitra Simulation Engine
 * 
 * Runs inside the backend process. Deploys simulated buses that flow through
 * the same busCache → Socket.io pipeline as real buses. Admins control speed,
 * preferred stops, routes, and dwell behavior from the Admin Portal.
 */

const path = require('path');
const haversine = require('../utils/haversine');

const dataDir = path.join(__dirname, '..', '..', '..', 'data');
let routesData = [];
let stopsData = [];
try { routesData = require(path.join(dataDir, 'routes.json')); } catch (e) {}
try { stopsData = require(path.join(dataDir, 'stops.json')); } catch (e) {}

let nextSimId = 1;

/**
 * Calculate bearing/heading between two points
 */
function calculateHeading(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

class SimulatedBus {
    constructor(config) {
        this.busId = config.busId || `SIM-${String(nextSimId++).padStart(3, '0')}`;
        this.routeId = config.routeId || 'M1';
        this.polyline = config.polyline || [];
        this.preferredStops = config.preferredStops || [];
        this.baseSpeedKmh = config.speedKmh || 25;
        this.dwellTimeMs = config.dwellTimeMs || 20000;
        this.loopMode = config.loopMode !== undefined ? config.loopMode : true;

        this.currentIndex = 0;
        this.isPaused = false;
        this.isFinished = false;
        this.isDwelling = false;
        this.isSimulated = true;
        this.deployedAt = Date.now();
        this.deployedBy = config.deployedBy || 'admin';

        this.lastSpeed = this.baseSpeedKmh;
        this.lastHeading = 0;
        this.timerId = null;
        this.dwellTimerId = null;

        // Resolve preferred stop coordinates for proximity checking
        this._resolveStopCoords();
    }

    _resolveStopCoords() {
        this.preferredStopCoords = [];
        for (const stopId of this.preferredStops) {
            const stop = stopsData.find(s => s.id === stopId);
            if (stop) {
                this.preferredStopCoords.push({ id: stop.id, lat: stop.lat, lng: stop.lng, name: stop.name });
            }
        }
    }

    /**
     * Start or restart the bus trip
     */
    start(busCache, io) {
        if (!this.polyline || this.polyline.length === 0) return;

        this.currentIndex = 0;
        this.isFinished = false;
        this.isDwelling = false;

        const firstPoint = this.polyline[0];

        // Register in busCache
        busCache.updateBus(this.busId, {
            busId: this.busId,
            driverId: `SIM-D-${this.busId}`,
            routeId: this.routeId,
            lat: firstPoint.lat,
            lng: firstPoint.lng,
            speed: 0,
            heading: 0,
            status: 'live',
            isSimulated: true,
            sessionId: `sim-${this.busId}-${Date.now()}`,
            startedAt: Date.now()
        });

        if (io) {
            io.emit('bus_update', busCache.getBus(this.busId));
        }

        console.log(`\x1b[35m[SIM-START]\x1b[0m ${this.busId} deployed on route ${this.routeId} (${this.polyline.length} points, ${this.baseSpeedKmh} km/h)`);

        // Start movement after a brief delay
        this._scheduleNextTick(busCache, io, 1000);
    }

    /**
     * Stop and clean up
     */
    stop(busCache) {
        if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
        if (this.dwellTimerId) { clearTimeout(this.dwellTimerId); this.dwellTimerId = null; }
        this.isFinished = true;
        this.isPaused = true;
        busCache.removeBus(this.busId);
        console.log(`\x1b[31m[SIM-STOP]\x1b[0m ${this.busId} removed`);
    }

    /**
     * Pause movement
     */
    pause() {
        this.isPaused = true;
        console.log(`\x1b[33m[SIM-PAUSE]\x1b[0m ${this.busId}`);
    }

    /**
     * Resume movement
     */
    resume(busCache, io) {
        if (!this.isPaused) return;
        this.isPaused = false;
        console.log(`\x1b[32m[SIM-RESUME]\x1b[0m ${this.busId}`);
        this._scheduleNextTick(busCache, io, 500);
    }

    /**
     * Update base speed
     */
    setSpeed(speedKmh) {
        this.baseSpeedKmh = Math.max(5, Math.min(60, speedKmh));
        console.log(`\x1b[36m[SIM-SPEED]\x1b[0m ${this.busId} → ${this.baseSpeedKmh} km/h`);
    }

    /**
     * Update preferred stops
     */
    setPreferredStops(stopIds) {
        this.preferredStops = stopIds || [];
        this._resolveStopCoords();
    }

    /**
     * Switch to a different polyline (alternate route)
     */
    setRoute(newPolyline, routeId) {
        this.polyline = newPolyline;
        if (routeId) this.routeId = routeId;
        this.currentIndex = 0;
        this.isFinished = false;
    }

    /**
     * Get serializable state for API responses
     */
    getState() {
        const currentPoint = this.polyline[this.currentIndex] || { lat: 0, lng: 0 };
        return {
            busId: this.busId,
            routeId: this.routeId,
            isPaused: this.isPaused,
            isDwelling: this.isDwelling,
            isFinished: this.isFinished,
            isSimulated: true,
            currentIndex: this.currentIndex,
            totalPoints: this.polyline.length,
            progress: `${this.currentIndex}/${this.polyline.length}`,
            progressPercent: this.polyline.length > 0 ? Math.round((this.currentIndex / this.polyline.length) * 100) : 0,
            baseSpeedKmh: this.baseSpeedKmh,
            currentSpeed: this.lastSpeed,
            heading: Math.round(this.lastHeading),
            lat: currentPoint.lat,
            lng: currentPoint.lng,
            preferredStops: this.preferredStops,
            dwellTimeMs: this.dwellTimeMs,
            loopMode: this.loopMode,
            deployedAt: this.deployedAt,
            deployedBy: this.deployedBy
        };
    }

    /**
     * Internal: schedule next movement tick
     */
    _scheduleNextTick(busCache, io, intervalMs) {
        if (this.timerId) clearTimeout(this.timerId);
        this.timerId = setTimeout(() => this._tick(busCache, io), intervalMs);
    }

    /**
     * Internal: main movement tick — advance one polyline point
     */
    _tick(busCache, io) {
        if (this.isPaused || this.isFinished || this.isDwelling) {
            this._scheduleNextTick(busCache, io, 2000);
            return;
        }

        // Check if route completed
        if (this.currentIndex >= this.polyline.length - 1) {
            if (this.loopMode) {
                console.log(`\x1b[35m[SIM-LOOP]\x1b[0m ${this.busId} completed route, restarting...`);
                this.currentIndex = 0;
                this._scheduleNextTick(busCache, io, 3000);
            } else {
                this.isFinished = true;
                console.log(`\x1b[35m[SIM-DONE]\x1b[0m ${this.busId} completed route (one-shot)`);
            }
            return;
        }

        const currentPoint = this.polyline[this.currentIndex];
        const nextIndex = this.currentIndex + 1;
        const nextPoint = this.polyline[nextIndex];

        // Calculate heading
        const heading = calculateHeading(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);

        // Realistic speed with ±15% jitter
        const jitter = 1 + (Math.random() * 0.3 - 0.15);
        const speed = Math.round(this.baseSpeedKmh * jitter);

        this.lastSpeed = speed;
        this.lastHeading = heading;

        // Update bus cache (same pipeline as real buses)
        busCache.updateBus(this.busId, {
            lat: currentPoint.lat,
            lng: currentPoint.lng,
            speed,
            heading: Math.round(heading),
            status: 'live',
            isSimulated: true,
            occupancy_tier: 'seated',
            ble_count: Math.floor(Math.random() * 20) + 10
        });

        // Emit Socket.io event
        if (io) {
            io.emit('bus_update', busCache.getBus(this.busId));
        }

        this.currentIndex = nextIndex;

        // Check if approaching a preferred stop — dwell if within 30m
        const isNearStop = this._checkNearPreferredStop(currentPoint.lat, currentPoint.lng);
        if (isNearStop) {
            this.isDwelling = true;
            console.log(`\x1b[33m[SIM-DWELL]\x1b[0m ${this.busId} dwelling at ${isNearStop.name} for ${this.dwellTimeMs / 1000}s`);

            // Update status to show dwelling
            busCache.updateBus(this.busId, { speed: 0, isSimulated: true });
            if (io) io.emit('bus_update', busCache.getBus(this.busId));

            this.dwellTimerId = setTimeout(() => {
                this.isDwelling = false;
                this._scheduleNextTick(busCache, io, 1000);
            }, this.dwellTimeMs);
            return;
        }

        // Calculate next interval based on speed
        const distKm = haversine(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);
        // Time to cover distance at current speed: t = d / v (hours) → ms
        let intervalMs = (distKm / (speed / 3600)) * 1000;
        // Clamp between 500ms and 8s for realistic feel
        intervalMs = Math.max(500, Math.min(8000, intervalMs));
        // Add small random jitter
        intervalMs += (Math.random() * 500 - 250);

        this._scheduleNextTick(busCache, io, intervalMs);
    }

    /**
     * Internal: check if current position is within 30m of any preferred stop
     */
    _checkNearPreferredStop(lat, lng) {
        for (const stop of this.preferredStopCoords) {
            const dist = haversine(lat, lng, stop.lat, stop.lng);
            if (dist <= 0.03) { // 30 meters
                return stop;
            }
        }
        return null;
    }
}

/**
 * Simulation Engine — manages all simulated buses
 */
class SimulationEngine {
    constructor() {
        this.buses = new Map();
        this.busCache = null;
        this.io = null;
    }

    /**
     * Initialize with shared dependencies
     */
    init(busCache, io) {
        this.busCache = busCache;
        this.io = io;
        console.log('[SimulationEngine] Initialized');
    }

    /**
     * Deploy a new simulated bus
     */
    deploy(config) {
        if (!this.busCache) throw new Error('SimulationEngine not initialized');

        // Resolve polyline from route data if not provided directly
        let polyline = config.polyline;
        if (!polyline || polyline.length === 0) {
            const route = routesData.find(r => r.id === config.routeId);
            if (!route || !route.polyline || route.polyline.length === 0) {
                throw new Error(`Route ${config.routeId} not found or has no polyline`);
            }
            polyline = route.polyline;
        }

        const bus = new SimulatedBus({ ...config, polyline });

        // Check for ID collision
        if (this.buses.has(bus.busId)) {
            throw new Error(`Bus ${bus.busId} already exists. Remove it first or choose a different ID.`);
        }

        this.buses.set(bus.busId, bus);
        bus.start(this.busCache, this.io);

        return bus.getState();
    }

    /**
     * Deploy multiple buses at once
     */
    deployFleet(configs) {
        const results = [];
        for (const config of configs) {
            try {
                results.push(this.deploy(config));
            } catch (err) {
                results.push({ error: err.message, config });
            }
        }
        return results;
    }

    /**
     * Remove a simulated bus
     */
    remove(busId) {
        const bus = this.buses.get(busId);
        if (!bus) return false;
        bus.stop(this.busCache);
        this.buses.delete(busId);
        if (this.io) {
            this.io.emit('bus_removed', { busId });
        }
        return true;
    }

    /**
     * Remove all simulated buses
     */
    clearAll() {
        const count = this.buses.size;
        for (const [busId, bus] of this.buses) {
            bus.stop(this.busCache);
        }
        this.buses.clear();
        if (this.io) {
            this.io.emit('simulation_cleared', { count });
        }
        console.log(`[SimulationEngine] Cleared ${count} simulated buses`);
        return count;
    }

    /**
     * Pause a simulated bus
     */
    pause(busId) {
        const bus = this.buses.get(busId);
        if (!bus) return false;
        bus.pause();
        return true;
    }

    /**
     * Resume a simulated bus
     */
    resume(busId) {
        const bus = this.buses.get(busId);
        if (!bus) return false;
        bus.resume(this.busCache, this.io);
        return true;
    }

    /**
     * Update speed of a simulated bus
     */
    setSpeed(busId, speedKmh) {
        const bus = this.buses.get(busId);
        if (!bus) return false;
        bus.setSpeed(speedKmh);
        return true;
    }

    /**
     * Update preferred stops
     */
    setPreferredStops(busId, stopIds) {
        const bus = this.buses.get(busId);
        if (!bus) return false;
        bus.setPreferredStops(stopIds);
        return true;
    }

    /**
     * Switch route for a simulated bus
     */
    setRoute(busId, newPolyline, routeId) {
        const bus = this.buses.get(busId);
        if (!bus) return false;
        bus.setRoute(newPolyline, routeId);
        return true;
    }

    /**
     * Get all simulated buses' state
     */
    getAllBuses() {
        const result = [];
        for (const [, bus] of this.buses) {
            result.push(bus.getState());
        }
        return result;
    }

    /**
     * Get a specific simulated bus state
     */
    getBus(busId) {
        const bus = this.buses.get(busId);
        return bus ? bus.getState() : null;
    }

    /**
     * Get the count of active simulated buses
     */
    get count() {
        return this.buses.size;
    }
}

// Singleton instance
const simulationEngine = new SimulationEngine();

module.exports = simulationEngine;
