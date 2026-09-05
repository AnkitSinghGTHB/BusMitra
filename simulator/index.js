const readline = require('readline');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const DRIVER_TOKEN = process.env.DRIVER_TOKEN || 'busmitra-driver-token';

// Load routes
const routesPath = path.join(__dirname, '../data/routes.json');
let routes = [];
try {
  routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
} catch (err) {
  console.error('[ERROR] Could not read routes.json. Make sure it exists at ../data/routes.json');
  process.exit(1);
}

const routeM1 = routes.find(r => r.id === 'M1');
if (!routeM1 || !routeM1.polyline || routeM1.polyline.length === 0) {
  console.error('[ERROR] Route M1 or its polyline data not found.');
  process.exit(1);
}

const polyline = routeM1.polyline;
let currentIndex = 0;
let isPaused = false;
let isFinished = false;

// Store-and-forward dead-zone buffer
let isOfflineDeadZone = false;
const offlineBuffer = [];

// Detour simulation state
let injectDetour = false;
let detourCount = 0;

// BLE Occupancy levels (cycles: 8 -> 24 -> 42)
const bleLevels = [8, 24, 42];
let bleIndex = 1;

let lastHeading = 0;
let lastSpeed = 25;
let timerId = null;

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

// Start trip session
async function startTrip() {
  const firstPoint = polyline[0];
  const payload = {
    busId: 'M1',
    driverId: 'D1',
    routeId: 'M1',
    lat: firstPoint.lat,
    lng: firstPoint.lng
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Driver-Token': DRIVER_TOKEN
      },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('\x1b[32m[START]\x1b[0m Trip session initialized. Session ID:', data.sessionId || 'active');
      isFinished = false;
      currentIndex = 0;
      offlineBuffer.length = 0;
    } else {
      console.error('\x1b[31m[ERROR]\x1b[0m Failed to start trip:', res.statusText);
    }
  } catch (err) {
    console.error('\x1b[31m[ERROR]\x1b[0m Backend not reachable at', BACKEND_URL);
  }
}

// Send single location or buffer if in dead-zone
async function sendLocationUpdate() {
  if (isPaused || isFinished) {
    scheduleNextUpdate(3000);
    return;
  }

  const currentPoint = polyline[currentIndex];

  // Check if reached destination
  if (currentIndex >= polyline.length - 1) {
    console.log(`\x1b[32m[DESTINATION]\x1b[0m Final stop reached at point ${polyline.length}/${polyline.length}. Trip finished!`);
    console.log(`\x1b[34m[LOOP]\x1b[0m Auto-restarting new trip in 5 seconds...`);
    setTimeout(() => {
      startTrip().then(() => scheduleNextUpdate(1000));
    }, 5000);
    return;
  }

  const nextIndex = currentIndex + 1;
  const nextPoint = polyline[nextIndex];
  const distanceKm = calculateDistance(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);

  // Approximate speed based on step
  let speedKmh = Math.max(15, Math.min(42, Math.round(distanceKm * 720 + (Math.random() * 8 - 4))));
  let heading = Math.round(calculateHeading(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng));

  let reportLat = currentPoint.lat;
  let reportLng = currentPoint.lng;

  // Detour simulation check (injects 450m deviation off corridor)
  if (injectDetour) {
    reportLat += 0.0035; // ~400m North
    reportLng += 0.0035; // ~400m East
    detourCount++;
    console.log(`\x1b[31m[DETOUR INJECTED]\x1b[0m Point off-route (${detourCount}/3): Lat: ${reportLat.toFixed(4)}, Lng: ${reportLng.toFixed(4)}`);
    if (detourCount >= 3) {
      injectDetour = false;
      detourCount = 0;
      console.log(`\x1b[33m[DETOUR ENDED]\x1b[0m Returning to scheduled corridor next tick.`);
    }
  }

  const currentBle = bleLevels[bleIndex];
  const payload = {
    busId: 'M1',
    lat: reportLat,
    lng: reportLng,
    speed: speedKmh,
    heading,
    ble_count: currentBle,
    timestamp: new Date().toISOString()
  };

  // Adaptive sampling calculation:
  // - High speed (> 30 km/h) & straight: interval 10s
  // - Turning (heading change >= 15 deg) or near stop: interval 4s
  // - Crawling / Stopped: interval 20s
  const headingDelta = Math.abs(heading - lastHeading);
  let nextIntervalMs = 4000;
  if (headingDelta >= 15) {
    nextIntervalMs = 3000; // Turning chowk, needs fast sampling
  } else if (speedKmh >= 28) {
    nextIntervalMs = 5000; // Cruising along highway
  } else if (speedKmh <= 10) {
    nextIntervalMs = 8000; // Crawling / idling
  }

  lastHeading = heading;
  lastSpeed = speedKmh;

  // 1. STORE-AND-FORWARD DEAD-ZONE LOGIC
  if (isOfflineDeadZone) {
    offlineBuffer.push(payload);
    console.log(`\x1b[33m[BUFFERED]\x1b[0m (Cellular Dead-Zone) Point ${currentIndex + 1}/${polyline.length} saved in local buffer. Queue size: ${offlineBuffer.length}`);
  } else {
    // 2. LIVE TRANSMISSION
    try {
      const res = await fetch(`${BACKEND_URL}/api/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Driver-Token': DRIVER_TOKEN
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const resData = await res.json();
        const snapTag = resData.snapped ? '\x1b[32m[Snapped to 50m corridor]\x1b[0m' : '\x1b[33m[Curbside pickup]\x1b[0m';
        console.log(`\x1b[36m[SEND]\x1b[0m Point ${currentIndex + 1}/${polyline.length} | Lat: ${reportLat.toFixed(4)}, Lng: ${reportLng.toFixed(4)} | Speed: ${speedKmh} km/h | Status: ${resData.status} | Occupancy: ${resData.occupancy_tier} ${snapTag}`);
      } else {
        console.error(`\x1b[31m[ERROR]\x1b[0m Status ${res.status} from backend`);
      }
    } catch (err) {
      console.error(`\x1b[33m[WARN]\x1b[0m Backend not responding. Buffering point locally.`);
      offlineBuffer.push(payload);
    }
  }

  currentIndex = nextIndex;
  scheduleNextUpdate(nextIntervalMs);
}

function scheduleNextUpdate(intervalMs) {
  if (timerId) clearTimeout(timerId);
  timerId = setTimeout(sendLocationUpdate, intervalMs);
}

// Flush store-and-forward batch queue to backend
async function flushOfflineBuffer() {
  if (offlineBuffer.length === 0) {
    console.log('\x1b[34m[FLUSH]\x1b[0m Local store-and-forward buffer is empty.');
    return;
  }

  console.log(`\x1b[32m[RECONNECTED]\x1b[0m Transmitting compressed batch of ${offlineBuffer.length} buffered points to backend...`);
  const batchPayload = {
    busId: 'M1',
    updates: [...offlineBuffer]
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/location/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Driver-Token': DRIVER_TOKEN
      },
      body: JSON.stringify(batchPayload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`\x1b[32m[BATCH SUCCESS]\x1b[0m Processed ${data.batch_processed} buffered points on server! Latest status: ${data.latest_status}`);
      offlineBuffer.length = 0;
    } else {
      console.error(`\x1b[31m[BATCH ERROR]\x1b[0m Backend returned status ${res.status}`);
    }
  } catch (e) {
    console.error(`\x1b[31m[BATCH FAILED]\x1b[0m Could not reach backend to flush buffer:`, e.message);
  }
}

// CLI Interactive Controls
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase();
  if (cmd === 'p' || cmd === 'pause') {
    isPaused = true;
    console.log('\x1b[33m[PAUSE]\x1b[0m Simulation paused. Bus will degrade to GTFS after 60s.');
  } else if (cmd === 'r' || cmd === 'resume' || cmd === 'restart') {
    if (isFinished) {
      console.log('\x1b[32m[RESTART]\x1b[0m Restarting trip from depot origin...');
      startTrip().then(() => scheduleNextUpdate(1000));
    } else {
      isPaused = false;
      console.log('\x1b[32m[RESUME]\x1b[0m Simulation resumed.');
      scheduleNextUpdate(1000);
    }
  } else if (cmd === 'b' || cmd === 'buffer' || cmd === 'deadzone') {
    isOfflineDeadZone = true;
    console.log('\x1b[33m[DEAD ZONE ACTIVE]\x1b[0m Cellular network dropped. Telemetry is now being buffered in local SQLite/IndexedDB queue.');
  } else if (cmd === 'c' || cmd === 'connect' || cmd === 'flush') {
    isOfflineDeadZone = false;
    console.log('\x1b[32m[NETWORK RESTORED]\x1b[0m Cellular connectivity re-established.');
    flushOfflineBuffer();
  } else if (cmd === 'd' || cmd === 'detour') {
    injectDetour = true;
    console.log('\x1b[31m[SIMULATE DETOUR]\x1b[0m Next 3 GPS pings will inject a 400m deviation to trigger Isolation Forest / off-route alert!');
  } else if (cmd === 'o' || cmd === 'occupancy') {
    bleIndex = (bleIndex + 1) % bleLevels.length;
    console.log(`\x1b[35m[BLE OCCUPANCY TOGGLED]\x1b[0m New BLE beacon count: ${bleLevels[bleIndex]} devices`);
  } else if (cmd === 'q' || cmd === 'quit') {
    console.log('\x1b[35m[QUIT]\x1b[0m Exiting simulator.');
    if (timerId) clearTimeout(timerId);
    process.exit(0);
  } else if (cmd === 's' || cmd === 'status') {
    console.log(`\x1b[34m[STATUS]\x1b[0m Point: ${currentIndex + 1}/${polyline.length} | DeadZone: ${isOfflineDeadZone} | BufferQueue: ${offlineBuffer.length} | BLE: ${bleLevels[bleIndex]}`);
  } else {
    console.log('Commands: [p]ause, [r]esume, [b]uffer deadzone, [c]onnect & flush, [d]etour test, [o]ccupancy toggle, [s]tatus, [q]uit');
  }
});

console.log('================================================================');
console.log('🚌 BusMitra Advanced Transit Telemetry & Edge Simulator');
console.log('Features: Adaptive Sampling | Store-and-Forward | Detour | BLE');
console.log('Keys: [p]ause | [r]esume | [b]uffer deadzone | [c]onnect flush | [d]etour | [o]ccupancy');
console.log('================================================================');

startTrip().then(() => {
  scheduleNextUpdate(1000);
});
