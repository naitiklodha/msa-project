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
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }
});

const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

function requiredServiceUrl(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value.replace(/\/+$/, '');
}

const serviceUrls = {
  auth: requiredServiceUrl('AUTH_SERVICE_URL'),
  game: requiredServiceUrl('GAME_SERVICE_URL'),
  timer: requiredServiceUrl('TIMER_SERVICE_URL'),
  rag: requiredServiceUrl('RAG_SERVICE_URL'),
  leaderboard: requiredServiceUrl('LEADERBOARD_SERVICE_URL'),
  analytics: requiredServiceUrl('ANALYTICS_SERVICE_URL'),
};

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

    const [authRes, gameRes, timerRes, ragRes, leaderboardRes, analyticsRes] = await Promise.all([
      fetchData(`${serviceUrls.auth}/health/live`),
      fetchData(`${serviceUrls.game}/health/live`),
      fetchData(`${serviceUrls.timer}/health/live`),
      fetchData(`${serviceUrls.rag}/health/live`),
      fetchData(`${serviceUrls.leaderboard}/health/live`),
      fetchData(`${serviceUrls.analytics}/overview`)
    ]);

    // Constructing actual stats from the Go analytics service data
    res.json({
        services: {
            auth: authRes.status,
            game: gameRes.status,
            timer: timerRes.status,
            rag: ragRes.status,
            leaderboard: leaderboardRes.status,
            analytics: analyticsRes.status === 'ok' || analyticsRes.total_users !== undefined ? 'ok' : 'error'
        },
        dashboard: {
            users: analyticsRes.total_users || 0,
            activeGames: analyticsRes.total_scored || 0,
            activeTimers: analyticsRes.total_sessions || 0,
            activeToday: analyticsRes.active_today || 0
        }
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

async function shutdown(signal) {
  logger.info({ msg: `${signal} - shutting down` });
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
