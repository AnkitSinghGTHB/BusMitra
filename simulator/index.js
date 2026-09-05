const fetch = require('node-fetch');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const UPDATE_INTERVAL = 3000; // 3 seconds

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
let intervalId = null;

// Haversine formula to calculate distance in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;  
  const dLon = (lon2 - lon1) * Math.PI / 180; 
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; 
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

const DRIVER_TOKEN = process.env.DRIVER_TOKEN || 'busmitra-driver-token';
let isFinished = false;

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
      console.log('\x1b[32m[START]\x1b[0m Trip started successfully on backend. Session:', data.sessionId || 'active');
      isFinished = false;
      currentIndex = 0;
    } else {
      console.error('\x1b[31m[ERROR]\x1b[0m Failed to start trip:', res.statusText);
    }
  } catch (err) {
    console.error('\x1b[31m[ERROR]\x1b[0m Backend not reachable at', BACKEND_URL);
  }
}

// Send location update
async function sendLocationUpdate() {
  if (isPaused || isFinished) return;

  const currentPoint = polyline[currentIndex];

  // Check if reached destination
  if (currentIndex >= polyline.length - 1) {
    console.log(`\x1b[32m[DESTINATION]\x1b[0m Reached final stop at point ${polyline.length}/${polyline.length}. Trip completed!`);
    
    // Send final stop ping with 0 km/h
    try {
      await fetch(`${BACKEND_URL}/api/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Driver-Token': DRIVER_TOKEN
        },
        body: JSON.stringify({
          busId: 'M1',
          lat: currentPoint.lat,
          lng: currentPoint.lng,
          speed: 0,
          heading: 0
        })
      });
      
      // End trip session gracefully
      await fetch(`${BACKEND_URL}/api/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Driver-Token': DRIVER_TOKEN
        },
        body: JSON.stringify({ busId: 'M1' })
      });
      console.log('\x1b[32m[COMPLETE]\x1b[0m Backend notified of trip completion. Type [r] to restart trip or [q] to quit.');
    } catch (e) {}

    isFinished = true;
    return;
  }

  let nextIndex = currentIndex + 1;
  const nextPoint = polyline[nextIndex];

  const distanceKm = calculateDistance(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);
  
  // Base speed in km/h based on distance and update interval
  let speedKmh = (distanceKm / (UPDATE_INTERVAL / 1000 / 3600));
  
  // Cap at 35, min 15 for realistic city bus
  if (speedKmh > 35) speedKmh = 35;
  if (speedKmh < 15) speedKmh = 15;
  
  // Add random variation (-5 to +5)
  speedKmh += (Math.random() * 10 - 5);
  speedKmh = Math.max(0, speedKmh); // Ensure not negative

  const heading = calculateHeading(currentPoint.lat, currentPoint.lng, nextPoint.lat, nextPoint.lng);

  const payload = {
    busId: 'M1',
    lat: currentPoint.lat,
    lng: currentPoint.lng,
    speed: Math.round(speedKmh),
    heading: Math.round(heading)
  };

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
      console.log(`\x1b[36m[SEND]\x1b[0m Point ${currentIndex + 1}/${polyline.length} | Lat: ${currentPoint.lat.toFixed(4)}, Lng: ${currentPoint.lng.toFixed(4)} | Speed: ${Math.round(speedKmh)} km/h | Heading: ${Math.round(heading)}°`);
    } else {
      console.error(`\x1b[31m[ERROR]\x1b[0m Status ${res.status} from backend`);
    }
  } catch (err) {
    console.error(`\x1b[33m[WARN]\x1b[0m Backend not responding`);
  }

  currentIndex = nextIndex;
}

// CLI setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase();
  if (cmd === 'p' || cmd === 'pause') {
    isPaused = true;
    console.log('\x1b[33m[PAUSE]\x1b[0m Simulation paused. Bus will go offline after 60s.');
  } else if (cmd === 'r' || cmd === 'resume' || cmd === 'restart') {
    if (isFinished) {
      console.log('\x1b[32m[RESTART]\x1b[0m Restarting trip from origin...');
      startTrip();
    } else {
      isPaused = false;
      console.log('\x1b[32m[RESUME]\x1b[0m Simulation resumed.');
    }
  } else if (cmd === 'q' || cmd === 'quit') {
    console.log('\x1b[35m[QUIT]\x1b[0m Exiting simulator.');
    clearInterval(intervalId);
    process.exit(0);
  } else if (cmd === 's' || cmd === 'status') {
    console.log(`\x1b[34m[STATUS]\x1b[0m Paused: ${isPaused}, Finished: ${isFinished}, Point: ${currentIndex + 1}/${polyline.length}`);
  } else {
    console.log('Commands: [p]ause, [r]esume/restart, [s]tatus, [q]uit');
  }
});

console.log('BusMitra Simulator started. Press [p] to pause, [r] to resume/restart, [q] to quit.');

// Init
startTrip().then(() => {
  intervalId = setInterval(sendLocationUpdate, UPDATE_INTERVAL);
  // Send first update immediately
  sendLocationUpdate();
});
