const readline = require('readline');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const DRIVER_TOKEN = process.env.DRIVER_TOKEN || 'busmitra-driver-token';

const routesPath = path.join(__dirname, '../data/routes.json');
let routes = [];
try {
  routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
} catch (err) {
  console.error('[ERROR] Could not read routes.json');
  process.exit(1);
}

// Haversine distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
}

// Calculate bearing/heading
function calculateHeading(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

class BusSimulator {
    constructor(routeId, busId, polyline, delayOffsetMs = 0) {
        this.routeId = routeId;
        this.busId = busId;
        this.polyline = polyline || [];
        this.currentIndex = 0;
        this.isPaused = false;
        this.isFinished = false;
        this.isOfflineDeadZone = false;
        this.offlineBuffer = [];
        this.injectDetour = false;
        this.detourCount = 0;
        
        this.bleLevels = [8, 24, 42];
        this.bleIndex = Math.floor(Math.random() * 3);
        
        this.lastHeading = 0;
        this.lastSpeed = 25;
        this.timerId = null;
        this.delayOffsetMs = delayOffsetMs;
    }

    async startTrip() {
        if (!this.polyline || this.polyline.length === 0) return;
        
        const firstPoint = this.polyline[0];
        const payload = {
            busId: this.busId,
            driverId: `D-${this.busId}`,
            routeId: this.routeId,
            lat: firstPoint.lat,
            lng: firstPoint.lng
        };

        try {
            const res = await fetch(`${BACKEND_URL}/api/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                this.isFinished = false;
                this.currentIndex = 0;
                this.offlineBuffer.length = 0;
                console.log(`\x1b[32m[START]\x1b[0m ${this.busId} initialized.`);
                
                setTimeout(() => {
                    this.scheduleNextUpdate(1000);
                }, this.delayOffsetMs);
                
            }
        } catch (err) {}
    }

    async sendLocationUpdate() {
        if (this.isPaused || this.isFinished) {
            this.scheduleNextUpdate(3000);
            return;
        }

        const currentPoint = this.polyline[this.currentIndex];

        if (this.currentIndex >= this.polyline.length - 1) {
            console.log(`\x1b[32m[DESTINATION]\x1b[0m ${this.busId} finished! Restarting...`);
            setTimeout(() => this.startTrip(), 5000);
            return;
        }

        const nextIndex = this.currentIndex + 1;
        const nextPoint = this.polyline[nextIndex];
        const distanceKm = calculateDistance(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);

        let speedKmh = Math.max(15, Math.min(42, Math.round(distanceKm * 720 + (Math.random() * 8 - 4))));
        let heading = Math.round(calculateHeading(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng));

        let reportLat = currentPoint.lat;
        let reportLng = currentPoint.lng;

        if (this.injectDetour) {
            reportLat += 0.0035;
            reportLng += 0.0035;
            this.detourCount++;
            if (this.detourCount >= 3) {
                this.injectDetour = false;
                this.detourCount = 0;
            }
        }

        const payload = {
            busId: this.busId,
            lat: reportLat,
            lng: reportLng,
            speed: speedKmh,
            heading,
            ble_count: this.bleLevels[this.bleIndex],
            timestamp: new Date().toISOString()
        };

        const headingDelta = Math.abs(heading - this.lastHeading);
        let nextIntervalMs = 4000;
        if (headingDelta >= 15) nextIntervalMs = 3000;
        else if (speedKmh >= 28) nextIntervalMs = 5000;
        else if (speedKmh <= 10) nextIntervalMs = 8000;

        // Spread out requests naturally with slight jitter
        nextIntervalMs += (Math.random() * 1000 - 500);

        this.lastHeading = heading;
        this.lastSpeed = speedKmh;

        if (this.isOfflineDeadZone) {
            this.offlineBuffer.push(payload);
        } else {
            try {
                const res = await fetch(`${BACKEND_URL}/api/location`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
                    body: JSON.stringify(payload)
                });
                
                // Logging for M1 only to avoid console spam
                if (res.ok && this.busId === 'M1') {
                    const resData = await res.json();
                    console.log(`\x1b[36m[SEND]\x1b[0m ${this.busId} Pt ${this.currentIndex + 1}/${this.polyline.length} | Status: ${resData.status}`);
                }
            } catch (err) {
                this.offlineBuffer.push(payload);
            }
        }

        this.currentIndex = nextIndex;
        this.scheduleNextUpdate(nextIntervalMs);
    }

    scheduleNextUpdate(intervalMs) {
        if (this.timerId) clearTimeout(this.timerId);
        this.timerId = setTimeout(() => this.sendLocationUpdate(), intervalMs);
    }

    async flushOfflineBuffer() {
        if (this.offlineBuffer.length === 0) return;
        const batchPayload = { busId: this.busId, updates: [...this.offlineBuffer] };
        try {
            const res = await fetch(`${BACKEND_URL}/api/location/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
                body: JSON.stringify(batchPayload)
            });
            if (res.ok) this.offlineBuffer.length = 0;
        } catch (e) {}
    }
}

// Select 8 routes to simulate
const selectedRoutes = routes.slice(0, 8);
const activeBuses = [];

selectedRoutes.forEach((r, idx) => {
    // Stagger start times
    const delay = idx * 2000; 
    const bus = new BusSimulator(r.id, r.id, r.polyline, delay);
    activeBuses.push(bus);
    bus.startTrip();
});

// Setup minimal API server for browser control panel
const http = require('http');
const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/api/sim/buses' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const data = activeBuses.map(b => ({
            busId: b.busId,
            routeId: b.routeId,
            isPaused: b.isPaused,
            bleCount: b.bleLevels[b.bleIndex],
            progress: `${b.currentIndex}/${b.polyline.length}`,
            speed: b.lastSpeed
        }));
        res.end(JSON.stringify(data));
        return;
    }

    if (req.url.startsWith('/api/sim/control') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            const { busId, action, value } = JSON.parse(body);
            const bus = activeBuses.find(b => b.busId === busId);
            if (bus) {
                if (action === 'pause') bus.isPaused = true;
                if (action === 'resume') bus.isPaused = false;
                if (action === 'occupancy') {
                    const idx = bus.bleLevels.indexOf(value);
                    if (idx !== -1) bus.bleIndex = idx;
                }
                if (action === 'detour') bus.injectDetour = true;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(3001, () => {
    console.log('================================================================');
    console.log(`🚌 BusMitra Multi-Bus Simulator Running (${activeBuses.length} buses)`);
    console.log('API running on port 3001 for browser control panel.');
    console.log('================================================================');
});
