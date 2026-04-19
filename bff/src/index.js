'use strict';

const express = require('express');
const { config, logger, requestId, createMetrics, errorHandler, healthRoutes } = require('@focuspulse/shared');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

app.use(express.json());
app.use(requestId);
app.use(metricsMiddleware);

// Health checks
app.use('/', healthRoutes(config.serviceName, null, null));

// Aggregation logic
app.get('/api/dashboard', async (req, res, next) => {
  try {
    const fetchData = async (url) => {
        try {
            const resp = await axios.get(url, { headers: { 'x-request-id': req.requestId || 'bff-req' } });
            return { status: 'ok', ...resp.data };
        } catch (e) {
            return { status: 'error', count: 0, active: 0 };
        }
    };

    const [authRes, gameRes, timerRes] = await Promise.all([
      fetchData(`${process.env.AUTH_SERVICE_URL || 'http://auth-service:3001'}/healthz`),
      fetchData(`${process.env.GAME_SERVICE_URL || 'http://game-service:3002'}/game/healthz`),
      fetchData(`${process.env.TIMER_SERVICE_URL || 'http://timer-service:3004'}/timer/healthz`)
    ]);

    // Constructing mock stats based on health for demonstration.
    // In a real scenario, this would query actual `GET /stats` endpoints
    res.json({
        users: { count: authRes.status === 'ok' ? Math.floor(Math.random() * 100) + 12 : 0, status: authRes.status },
        games: { active: gameRes.status === 'ok' ? Math.floor(Math.random() * 20) + 3 : 0, status: gameRes.status },
        timer: { active: timerRes.status === 'ok' ? Math.floor(Math.random() * 50) + 10 : 0, status: timerRes.status }
    });
  } catch (err) {
    next(err);
  }
});

app.get('/metrics', metricsHandler);
app.use(errorHandler);

// WebSocket real-time simulation
io.on('connection', (socket) => {
    logger.info({ msg: 'Client connected to websockets', socketId: socket.id });

    const interval = setInterval(() => {
        // Send random dynamic simulated updates
        socket.emit('dashboard_update', {
            users: { count: Math.floor(Math.random() * 150) + 20, status: 'ok' },
            games: { active: Math.floor(Math.random() * 30) + 5, status: 'ok' },
            timer: { active: Math.floor(Math.random() * 80) + 15, status: 'ok' }
        });
    }, 3000);

    socket.on('disconnect', () => {
        clearInterval(interval);
        logger.info({ msg: 'Client disconnected', socketId: socket.id });
    });
});

server.listen(config.port, () => logger.info({ msg: `BFF listening on port ${config.port}`, port: config.port }));
