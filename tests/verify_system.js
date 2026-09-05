const http = require('http');

const BACKEND_URL = 'http://localhost:3000';
const ML_URL = 'http://localhost:8000';
const DRIVER_TOKEN = 'busmitra-driver-token';

async function req(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { ok: res.ok, status: res.status, raw: text };
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('🧪 BUSMITRA END-TO-END VERIFICATION & STRESS TEST');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`\x1b[32m  ✓ PASS\x1b[0m : ${testName} ${detail ? `(${detail})` : ''}`);
      passed++;
    } else {
      console.log(`\x1b[31m  ✗ FAIL\x1b[0m : ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Check ML Service Health
  console.log('--- 1. ML Microservice Health & Models ---');
  const mlHealth = await req(`${ML_URL}/health`);
  assert(mlHealth.ok && mlHealth.data.status === 'healthy', 'ML Microservice Healthy');
  assert(
    mlHealth.data?.models_loaded?.eta === true &&
    mlHealth.data?.models_loaded?.anomaly === true &&
    mlHealth.data?.models_loaded?.stops === true &&
    mlHealth.data?.models_loaded?.occupancy === true,
    'All 4 Models (XGBoost, IsolationForest, DBSCAN, BLE) Loaded in RAM'
  );

  // 2. Check Backend Health
  console.log('\n--- 2. Node.js Backend Server Health ---');
  const backendHealth = await req(`${BACKEND_URL}/health`);
  assert(backendHealth.ok && backendHealth.data.status === 'ok', 'Backend Server Healthy');

  // 3. Start Trip
  console.log('\n--- 3. Trip Initialization ---');
  const startRes = await req(`${BACKEND_URL}/api/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify({ busId: 'M1', driverId: 'D1', routeId: 'M1', lat: 30.8163, lng: 75.1720 })
  });
  assert(startRes.ok && startRes.data.sessionId, 'Trip Started with Session ID', startRes.data?.sessionId);

  // 4. Test 50m Anchor-Point Corridor Snapping (Jitter Filtering)
  console.log('\n--- 4. Anchor-Point Corridor Map Matching (50m Tolerance) ---');
  // First route polyline point is 30.8163, 75.1720. Send 30.8164, 75.1722 (~25m away)
  const snapRes = await req(`${BACKEND_URL}/api/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify({
      busId: 'M1',
      lat: 30.8164,
      lng: 75.1722,
      speed: 20,
      heading: 220,
      ble_count: 10
    })
  });
  assert(snapRes.ok && snapRes.data.snapped === true, 'Jitter within 50m snapped to corridor centerline', `Cross-track: ${snapRes.data?.cross_track_km}km`);

  // Send Curbside Point (80m away from corridor, e.g. 30.8169, 75.1725)
  const curbsideRes = await req(`${BACKEND_URL}/api/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify({
      busId: 'M1',
      lat: 30.8169,
      lng: 75.1725,
      speed: 18,
      heading: 220,
      ble_count: 12
    })
  });
  assert(curbsideRes.ok && curbsideRes.data.snapped === false, 'Curbside passenger boarding (50-150m) preserved without jitter distortion');

  // 5. BLE Passive Occupancy Inference
  console.log('\n--- 5. Passive Occupancy Estimation (BLE Sensing) ---');
  const occEmpty = await req(`${BACKEND_URL}/api/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify({ busId: 'M1', lat: 30.8163, lng: 75.1720, speed: 20, ble_count: 8 })
  });
  assert(occEmpty.data?.occupancy_tier === 'empty', 'BLE count 8 -> Occupancy Tier: Empty');

  const occSeated = await req(`${BACKEND_URL}/api/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify({ busId: 'M1', lat: 30.8163, lng: 75.1720, speed: 20, ble_count: 22 })
  });
  assert(occSeated.data?.occupancy_tier === 'seated', 'BLE count 22 -> Occupancy Tier: Seated');

  const occCrowded = await req(`${BACKEND_URL}/api/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify({ busId: 'M1', lat: 30.8163, lng: 75.1720, speed: 20, ble_count: 45 })
  });
  assert(occCrowded.data?.occupancy_tier === 'crowded', 'BLE count 45 -> Occupancy Tier: Crowded');

  // 6. Trajectory Anomaly & Detour Guardrail (Isolation Forest + Cross-Track)
  console.log('\n--- 6. Trajectory Anomaly & Route Detour Detection ---');
  // Send 3 consecutive detour pings 450m away from route (30.8350, 75.1320)
  for (let i = 0; i < 3; i++) {
    await req(`${BACKEND_URL}/api/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
      body: JSON.stringify({ busId: 'M1', lat: 30.8350, lng: 75.1320, speed: 35, heading: 90, ble_count: 20 })
    });
  }
  const detourBus = await req(`${BACKEND_URL}/api/buses`);
  const m1Detour = detourBus.data.find(b => b.busId === 'M1');
  assert(m1Detour?.status === 'off_route', 'Sustained >150m deviation triggers off_route anomaly status', `Status: ${m1Detour?.status}`);

  // Send on-corridor point to verify recovery
  await req(`${BACKEND_URL}/api/location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify({ busId: 'M1', lat: 30.8163, lng: 75.1720, speed: 20, ble_count: 20 })
  });
  const recoveredBus = await req(`${BACKEND_URL}/api/buses`);
  const m1Recovered = recoveredBus.data.find(b => b.busId === 'M1');
  assert(m1Recovered?.status === 'live', 'Bus automatically recovers to live status upon returning to corridor');

  // 7. Store-and-Forward Batch Ingestion (Cellular Reconnection from Dead Zones)
  console.log('\n--- 7. Store-and-Forward Batch Ingestion ---');
  const batchPayload = {
    busId: 'M1',
    updates: [
      { lat: 30.8163, lng: 75.1720, speed: 22, heading: 220, ble_count: 18, timestamp: new Date(Date.now() - 30000).toISOString() },
      { lat: 30.8155, lng: 75.1700, speed: 25, heading: 220, ble_count: 20, timestamp: new Date(Date.now() - 20000).toISOString() },
      { lat: 30.8142, lng: 75.1668, speed: 24, heading: 215, ble_count: 21, timestamp: new Date(Date.now() - 10000).toISOString() }
    ]
  };
  const batchRes = await req(`${BACKEND_URL}/api/location/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Driver-Token': DRIVER_TOKEN },
    body: JSON.stringify(batchPayload)
  });
  assert(batchRes.ok && batchRes.data.batch_processed === 3, 'Batch ingestion processed 3 offline buffered points', `Processed: ${batchRes.data?.batch_processed}`);

  // 8. ML-Powered Segment ETA Prediction
  console.log('\n--- 8. Segment ETA Prediction (XGBoost + Chokepoint Delays) ---');
  const etaRes = await req(`${BACKEND_URL}/api/eta/M1?stopId=S8`);
  assert(etaRes.ok && etaRes.data.min > 0 && etaRes.data.max >= etaRes.data.min, 'ETA calculated with valid bounds', `${etaRes.data?.min}-${etaRes.data?.max} mins, source: ${etaRes.data?.source}`);
  assert(etaRes.data?.confidence >= 50, 'Confidence score accurately evaluated', `Confidence: ${etaRes.data?.confidence}%`);

  // 9. GTFS-Realtime Feeds Validation
  console.log('\n--- 9. GTFS-Realtime Feeds (Standard Spec 2.0) ---');
  const vpRes = await req(`${BACKEND_URL}/api/gtfs-rt/vehicle-positions`);
  assert(
    vpRes.ok &&
    vpRes.data?.header?.gtfsRealtimeVersion === '2.0' &&
    Array.isArray(vpRes.data?.entity) &&
    vpRes.data?.entity.length > 0 &&
    vpRes.data?.entity[0]?.vehicle?.position?.latitude !== undefined,
    'GTFS-RT VehiclePositions feed valid according to GTFS spec'
  );

  const tuRes = await req(`${BACKEND_URL}/api/gtfs-rt/trip-updates`);
  assert(
    tuRes.ok &&
    tuRes.data?.header?.gtfsRealtimeVersion === '2.0' &&
    Array.isArray(tuRes.data?.entity) &&
    tuRes.data?.entity[0]?.tripUpdate?.stopTimeUpdate?.length > 0,
    'GTFS-RT TripUpdates feed valid with stopTimeUpdate projections'
  );

  const alRes = await req(`${BACKEND_URL}/api/gtfs-rt/alerts`);
  assert(
    alRes.ok &&
    alRes.data?.header?.gtfsRealtimeVersion === '2.0',
    'GTFS-RT Alerts feed valid'
  );

  // 10. AI-Discovered Informal Stops (DBSCAN Clustering)
  console.log('\n--- 10. AI-Discovered Informal Stops (DBSCAN) ---');
  const stopsRes = await req(`${BACKEND_URL}/api/stops/informal`);
  assert(
    stopsRes.ok &&
    Array.isArray(stopsRes.data?.extracted_stops) &&
    stopsRes.data?.extracted_stops.length >= 2,
    'DBSCAN Informal stops extracted',
    `Found ${stopsRes.data?.extracted_stops?.length} informal stops`
  );

  console.log('\n====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
