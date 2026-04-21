'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {
  config,
  logger,
  createRedisClient,
  createMetrics,
  errorHandler,
  requestId,
  healthRoutes,
  authMiddleware,
  createKafkaClient,
  createConsumer,
} = require('@focuspulse/shared');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

app.use(express.json());
app.use(requestId);
app.use(metricsMiddleware);

const redis = createRedisClient(config.redisUrl);
const kafka = createKafkaClient(config.serviceName, config.kafkaBrokers);

// Health & metrics
app.get('/metrics', metricsHandler);
app.use('/', healthRoutes(config.serviceName, null, redis));

const auth = authMiddleware(config.jwtSecret);

/**
 * Get the global leaderboard
 */
app.get('/global', async (req, res, next) => {
  try {
    // Get top 100
    const topScores = await redis.zrevrange('leaderboard:global', 0, 99, 'WITHSCORES');
    
    const results = [];
    for (let i = 0; i < topScores.length; i += 2) {
      const userId = topScores[i];
      const score = topScores[i + 1];
      const email = await redis.hget('user:emails', userId) || 'Private User';
      
      results.push({ userId, email, score: parseInt(score, 10) });
    }
    
    res.json({ leaderboard: results });
  } catch (err) {
    next(err);
  }
});

// Websocket updates (emitted every 5 seconds for real-time feel)
setInterval(async () => {
    try {
        const topScores = await redis.zrevrange('leaderboard:global', 0, 9, 'WITHSCORES');
        const results = [];
        for (let i = 0; i < topScores.length; i += 2) {
            const userId = topScores[i];
            const score = topScores[i + 1];
            const email = await redis.hget('user:emails', userId) || 'Private User';
            results.push({ email, score: parseInt(score, 10) });
        }
        io.emit('leaderboard_update', results);
    } catch (err) {
        logger.error({ msg: 'Failed to broadcast leaderboard', error: err.message });
    }
}, 5000);

app.use(errorHandler);

async function bootstrap() {
  await createConsumer(kafka, config.serviceName, ['user-events', 'game-events'], async ({ message }) => {
    try {
      const data = JSON.parse(message.value.toString());
      const { eventType, userId, email, score } = data;

      if (eventType === 'USER_REGISTERED') {
        if (email) await redis.hset('user:emails', userId, email);
        // Initialize user with 0 score to show in total users tracked
        await redis.zadd('leaderboard:global', 0, userId);
      } else if (eventType === 'GAME_SCORED') {
        // Increment user's global score
        if (score) await redis.zincrby('leaderboard:global', score, userId);
      }
    } catch (err) {
      logger.error({ msg: 'Failed to process event for leaderboard', error: err.message });
    }
  });

  server.listen(config.port, () => {
    logger.info({ msg: `Leaderboard service listening`, port: config.port });
  });
}

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ msg: `${signal} — shutting down` });
  await redis?.quit();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch(err => {
  logger.fatal({ msg: 'Startup failed', error: err.message });
  process.exit(1);
});
