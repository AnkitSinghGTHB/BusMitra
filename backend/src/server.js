const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const startRouter = require('./api/start');
const stopRouter = require('./api/stop');
const locationRouter = require('./api/location');
const busesRouter = require('./api/buses');
const etaRouter = require('./api/eta');
const checkinRouter = require('./api/checkin');
const smsWebhookRouter = require('./api/smsWebhook');
const dbRouter = require('./api/db');
const gtfsRtRouter = require('./api/gtfsRt');
const routesRouter = require('./api/routes');
const stopsRouter = require('./api/stops');
const tripPlanRouter = require('./api/tripPlan');

const startFallbackTimer = require('./utils/fallbackTimer');
const busCache = require('./services/busCache');
const consensus = require('./services/consensus');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Trust proxy for IP extraction
app.set('trust proxy', 1);

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

// Global Rate Limiter: 200 requests per minute
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', globalLimiter);

// Specific Rate Limiter for Location endpoint (60 updates/min)
const locationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Location update rate limit exceeded (max 60 per minute).' }
});

// Specific Rate Limiter for Check-in endpoint (20 checkins/min per IP)
const checkinLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Check-in rate limit exceeded (max 20 per minute).' }
});

app.set('io', io);

app.use('/api/start', startRouter);
app.use('/api/stop', stopRouter);
app.use('/api/location', locationLimiter, locationRouter);
app.use('/api/buses', busesRouter);
app.use('/api/eta', etaRouter);
app.use('/api/checkin', checkinLimiter, checkinRouter);
app.use('/api/sms-webhook', smsWebhookRouter);
app.use('/api/db', dbRouter);
app.use('/api/gtfs-rt', gtfsRtRouter);
app.use('/gtfs-rt', gtfsRtRouter);
app.use('/api/routes', routesRouter);
app.use('/api/stops', stopsRouter);
app.use('/api/trip-plan', tripPlanRouter);

// Endpoint to fetch AI-discovered informal stops (DBSCAN)
app.get('/api/stops/informal', async (req, res) => {
    const ML_PRIMARY = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    try {
        const mlRes = await fetch(`${ML_PRIMARY}/extract-stops?route_id=M1`);
        if (mlRes.ok) {
            const data = await mlRes.json();
            return res.json(data);
        }
    } catch(e) {}
    
    // Fallback if ML service offline
    res.json({
        route_id: 'M1',
        source: 'cached_fallback',
        extracted_stops: [
            { stop_id: 'INF_1', name: 'Old Grain Market Chowk', lat: 30.8175, lng: 75.1705, historical_pickups: 60, avg_dwell_sec: 35 },
            { stop_id: 'INF_2', name: 'GT Road Coaching Center', lat: 30.8220, lng: 75.1510, historical_pickups: 55, avg_dwell_sec: 28 },
            { stop_id: 'INF_3', name: 'Civil Hospital Gate 2', lat: 30.8208, lng: 75.1555, historical_pickups: 48, avg_dwell_sec: 40 },
            { stop_id: 'INF_4', name: 'Canal Bridge Corner', lat: 30.8285, lng: 75.1310, historical_pickups: 42, avg_dwell_sec: 25 }
        ]
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        activeBuses: busCache.getAllBuses().length
    });
});

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/dist')));
    
    // SPA fallback
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
        }
    });
}

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
});

// Start fallback timer
startFallbackTimer(io, busCache);

// Periodic consensus memory cleanup (every 30 seconds)
setInterval(() => {
    consensus.clearOldCheckins();
}, 30000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`BusMitra backend running on port ${PORT}`);
});
