'use strict';

const express = require('express');
const {
  config, logger, requestId, createMetrics, errorHandler,
  healthRoutes, createPgPool, createRedisClient,
  createKafkaClient, createProducer, authMiddleware,
} = require('@focuspulse/shared');

const timerService = require('./services/timer.service');

const app = express();
const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

app.use(express.json());
app.use(requestId);
app.use(metricsMiddleware);

const pgPool = createPgPool(config.pgConnectionString);
const redis = createRedisClient(config.redisUrl);
const kafka = createKafkaClient(config.serviceName, config.kafkaBrokers);

async function bootstrap() {
  const { producer, produce } = await createProducer(kafka, config.serviceName);

  const service = timerService({ pgPool, redis, produce });

  // Health & metrics (public, no auth needed)
  app.get('/metrics', metricsHandler);
  app.use('/', healthRoutes(config.serviceName, pgPool, redis));

  // Everything below here needs a valid JWT
  const auth = authMiddleware(config.jwtSecret);

  // Start a new focus session
  app.post('/sessions', auth, async (req, res, next) => {
    try {
      const durationMinutes = req.body.durationMinutes || 25;
      const session = await service.startSession(req.userId, durationMinutes);
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  });

  // Check if there's something running
  app.get('/sessions/active', auth, async (req, res, next) => {
    try {
      const session = await service.getActiveSession(req.userId);
      if (!session) {
        return res.json({ active: false });
      }
      res.json({ active: true, session });
    } catch (err) {
      next(err);
    }
  });

  // Done focusing. This triggers the scoring chain.
  app.post('/sessions/:id/complete', auth, async (req, res, next) => {
    try {
      const session = await service.completeSession(req.userId, req.params.id);
      res.json({ message: 'Session completed', session });
    } catch (err) {
      next(err);
    }
  });

  // Gave up. No shame, but no points either.
  app.post('/sessions/:id/abandon', auth, async (req, res, next) => {
    try {
      const session = await service.abandonSession(req.userId, req.params.id);
      res.json({ message: 'Session abandoned', session });
    } catch (err) {
      next(err);
    }
  });

  // Session history
  app.get('/sessions/history', auth, async (req, res, next) => {
    try {
      const history = await service.getHistory(req.userId);
      res.json({ sessions: history });
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);
  app.listen(config.port, () => logger.info({ msg: `Timer service listening`, port: config.port }));
}

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ msg: `${signal} — shutting down` });
  await Promise.allSettled([pgPool?.end(), redis?.quit()]);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch(err => {
  logger.fatal({ msg: 'Startup failed', error: err.message });
  process.exit(1);
});
