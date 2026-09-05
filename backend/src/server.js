const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const startRouter = require('./api/start');
const locationRouter = require('./api/location');
const busesRouter = require('./api/buses');
const etaRouter = require('./api/eta');
const checkinRouter = require('./api/checkin');
const smsWebhookRouter = require('./api/smsWebhook');

const startFallbackTimer = require('./utils/fallbackTimer');
const busCache = require('./services/busCache');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors({ origin: '*' }));
app.use(express.json());

app.set('io', io);

app.use('/api/start', startRouter);
app.use('/api/location', locationRouter);
app.use('/api/buses', busesRouter);
app.use('/api/eta', etaRouter);
app.use('/api/checkin', checkinRouter);
app.use('/api/sms-webhook', smsWebhookRouter);

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

startFallbackTimer(io, busCache);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`BusMitra backend running on port ${PORT}`);
});
