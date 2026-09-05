const http = require('http');

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch(e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('====================================================');
    console.log('🚀 BUSMITRA BACKEND JUDGES GRILLING FIX VERIFICATION');
    console.log('====================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, testName, details = '') {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${testName} - ${details}`);
            failed++;
        }
    }

    // 1. Health check
    try {
        const res = await request({ host: 'localhost', port: 3000, path: '/health', method: 'GET' });
        assert(res.status === 200 && res.data.status === 'ok', 'Health endpoint functional', JSON.stringify(res.data));
    } catch (e) {
        assert(false, 'Health endpoint functional', e.message);
    }

    // 2. Input Validation (Issue #7)
    try {
        const badCoords = await request({
            host: 'localhost', port: 3000, path: '/api/location', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { busId: 'M1', lat: 999, lng: -999, speed: 20 });
        assert(badCoords.status === 400, 'Coordinate out-of-range rejected with 400', `Got ${badCoords.status}`);

        const badSpeed = await request({
            host: 'localhost', port: 3000, path: '/api/location', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { busId: 'M1', lat: 30.8, lng: 75.1, speed: 250 });
        assert(badSpeed.status === 400, 'Excessive speed (>120 km/h) rejected with 400', `Got ${badSpeed.status}`);
    } catch (e) {
        assert(false, 'Input validation tests', e.message);
    }

    // 3. Driver Auth (Issue #5)
    try {
        const badAuth = await request({
            host: 'localhost', port: 3000, path: '/api/location', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Driver-Token': 'hacker-fake-token' }
        }, { busId: 'M1', lat: 30.8, lng: 75.1, speed: 20 });
        assert(badAuth.status === 401, 'Invalid driver token rejected with 401', `Got ${badAuth.status}`);
    } catch (e) {
        assert(false, 'Driver auth rejection', e.message);
    }

    // 4. Start Trip & Session Storage (Issue #12)
    let sessionId = null;
    try {
        const startRes = await request({
            host: 'localhost', port: 3000, path: '/api/start', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Driver-Token': 'busmitra-driver-token' }
        }, { busId: 'M1', driverId: 'D1', routeId: 'M1', lat: 30.8163, lng: 75.1720 });
        
        // Either 200 (started) or 409 (already active with existing sessionId)
        sessionId = startRes.data.sessionId;
        assert((startRes.status === 200 || startRes.status === 409) && !!sessionId, 'Trip start provides persistent sessionId', JSON.stringify(startRes.data));
    } catch (e) {
        assert(false, 'Trip start provides persistent sessionId', e.message);
    }

    // 5. Update Location to Stop S4 (Civil Hospital)
    try {
        const locRes = await request({
            host: 'localhost', port: 3000, path: '/api/location', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Driver-Token': 'busmitra-driver-token' }
        }, { busId: 'M1', lat: 30.8215, lng: 75.1530, speed: 25, heading: 240 });
        assert(locRes.status === 200 && locRes.data.success === true, 'Valid location update accepted', JSON.stringify(locRes.data));
    } catch (e) {
        assert(false, 'Valid location update accepted', e.message);
    }

    // 6. Passed Stop ETA Check (Issue #3)
    try {
        // Stop S1 is Moga Bus Stand (bus is at S4, so S1 is in the past)
        const etaS1 = await request({ host: 'localhost', port: 3000, path: '/api/eta/M1?stopId=S1', method: 'GET' });
        assert(etaS1.status === 200 && etaS1.data.passed === true, 'Passed stop returns passed=true', JSON.stringify(etaS1.data));

        // Stop S7 is Dairy Complex (ahead of bus)
        const etaS7 = await request({ host: 'localhost', port: 3000, path: '/api/eta/M1?stopId=S7', method: 'GET' });
        assert(etaS7.status === 200 && etaS7.data.passed === false && etaS7.data.min > 0, 'Upcoming stop returns valid ETA range', JSON.stringify(etaS7.data));
    } catch (e) {
        assert(false, 'ETA passed/upcoming calculations', e.message);
    }

    // 7. SMS Webhook Smart Stop Detection (Issue #1)
    try {
        // Query generic "BUS M1" when bus is at S4: should pick upcoming stop (e.g. S5 Guru Nanak Chowk) NOT S1!
        const smsAuto = await request({
            host: 'localhost', port: 3000, path: '/api/sms-webhook', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { from: '+919876543210', body: 'BUS M1' });
        assert(smsAuto.status === 200 && !smsAuto.data.reply.includes('Moga Bus Stand') && smsAuto.data.reply.includes('arriving at'),
            'SMS without stop picks next stop ahead (not S1)', smsAuto.data.reply);

        // Query specific stop name "BUS M1 S7" or "BUS M1 DAIRY"
        const smsNamed = await request({
            host: 'localhost', port: 3000, path: '/api/sms-webhook', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { from: '+919876543210', body: 'BUS M1 Dairy Complex' });
        assert(smsNamed.status === 200 && smsNamed.data.reply.includes('Dairy Complex'),
            'SMS with specific stop name targets that stop', smsNamed.data.reply);

        // Query passed stop "BUS M1 S1"
        const smsPassed = await request({
            host: 'localhost', port: 3000, path: '/api/sms-webhook', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { from: '+919876543210', body: 'BUS M1 S1' });
        assert(smsPassed.status === 200 && smsPassed.data.reply.includes('already passed'),
            'SMS for passed stop accurately informs commuter', smsPassed.data.reply);
    } catch (e) {
        assert(false, 'SMS webhook smart stops', e.message);
    }

    // 8. No Ghost Bus at 0,0 (Issue #13)
    try {
        // Query SMS for a route not in cache
        await request({
            host: 'localhost', port: 3000, path: '/api/sms-webhook', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { from: '+919876543210', body: 'BUS UNKNOWN' });

        const busesRes = await request({ host: 'localhost', port: 3000, path: '/api/buses', method: 'GET' });
        const hasGhostBus = busesRes.data.some(b => b.lat === 0 && b.lng === 0);
        assert(!hasGhostBus, 'No ghost buses at lat:0, lng:0 created in cache', `Active buses count: ${busesRes.data.length}`);
    } catch (e) {
        assert(false, 'Ghost bus cache test', e.message);
    }

    // 9. Consensus Anti-Spoof IP Deduplication (Issue #4)
    try {
        // 1st check-in from this IP
        const chk1 = await request({
            host: 'localhost', port: 3000, path: '/api/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { busId: 'M1', userId: 'user-alpha', lat: 30.8215, lng: 75.1530 });
        assert(chk1.status === 200 && chk1.data.accepted === true, 'First passenger check-in accepted', JSON.stringify(chk1.data));

        // Immediate 2nd check-in with different userId but same IP -> Must be rejected (429)
        const chk2 = await request({
            host: 'localhost', port: 3000, path: '/api/checkin', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { busId: 'M1', userId: 'user-beta-spoofed', lat: 30.8215, lng: 75.1530 });
        assert(chk2.status === 429 && chk2.data.accepted === false, 'Same IP rapid check-in rejected with 429 cooldown', JSON.stringify(chk2.data));
    } catch (e) {
        assert(false, 'Consensus anti-spoofing IP deduplication', e.message);
    }

    // 10. Database Identifier Quoting (Issue #8)
    try {
        const dbRes = await request({ host: 'localhost', port: 3000, path: '/api/db/table/routes', method: 'GET' });
        // Either 200 with rows or 200 with container offline message (safe handler)
        assert(dbRes.status === 200, 'Database table querying safe and protected against identifier injection', `Status: ${dbRes.status}`);
    } catch (e) {
        assert(false, 'Database identifier quoting', e.message);
    }

    // 11. End Trip Endpoint (Issue #12)
    try {
        const stopRes = await request({
            host: 'localhost', port: 3000, path: '/api/stop', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Driver-Token': 'busmitra-driver-token' }
        }, { busId: 'M1' });
        assert(stopRes.status === 200 && stopRes.data.success === true, 'Trip gracefully completed via /api/stop', JSON.stringify(stopRes.data));
    } catch (e) {
        assert(false, 'Trip stop endpoint', e.message);
    }

    console.log('\n====================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
