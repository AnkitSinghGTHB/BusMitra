const express = require('express');
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

const startFallbackTimer = require('./utils/fallbackTimer');
const busCache = require('./services/busCache');
const consensus = require('./services/consensus');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Trust proxy for IP extraction
app.set('trust proxy', 1);

app.use(cors({ origin: '*' }));
app.use(express.json());

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

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        activeBuses: busCache.getAllBuses().length
    });
});

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
