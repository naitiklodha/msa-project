'use strict';

const express = require('express');
const {
  config, logger, createKafkaClient, createProducer, createConsumer,
  createPgPool, createRedisClient, createMetrics,
  errorHandler, requestId, healthRoutes, authMiddleware,
} = require('@focuspulse/shared');

const gameService = require('./services/game.service');

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

  const service = gameService({ pgPool, redis, produce });

  // This is the interesting part: game-service is both an HTTP server AND a Kafka consumer.
  // It listens for events from the timer and quiz services, scores them,
  // and emits GAME_SCORED events for the leaderboard.
  await createConsumer(kafka, config.serviceName, ['game-events'], async ({ message }) => {
    try {
      const data = JSON.parse(message.value.toString());
      const { eventType, userId } = data;

      if (eventType === 'FOCUS_SESSION_COMPLETED') {
        await service.scoreFocusSession(userId, data.durationMinutes);
      } else if (eventType === 'QUIZ_COMPLETED') {
        await service.scoreQuiz(userId, data.correctAnswers, data.totalQuestions);
      }
    } catch (err) {
      // Log but don't crash. We'll pick up the next message.
      logger.error({ msg: 'Failed to process game event', error: err.message });
    }
  });

  // Health & metrics (public)
  app.get('/metrics', metricsHandler);
  app.use('/', healthRoutes(config.serviceName, pgPool, redis));

  const auth = authMiddleware(config.jwtSecret);

  // Get your own stats
  app.get('/stats', auth, async (req, res, next) => {
    try {
      const stats = await service.getUserStats(req.userId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  // Protected route that was already here for the smoke test
  app.get('/status', auth, (req, res) => {
    res.json({ status: 'active', userId: req.userId });
  });

  app.use(errorHandler);
  app.listen(config.port, () => logger.info({ msg: `Game service listening`, port: config.port }));
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
