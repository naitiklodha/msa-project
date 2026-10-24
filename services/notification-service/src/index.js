'use strict';

const express = require('express');
const {
  config,
  logger,
  createKafkaClient,
  createConsumer,
  createRedisClient,
  createMetrics,
  errorHandler,
  requestId,
  healthRoutes,
  authMiddleware,
} = require('@focuspulse/shared');

const app = express();
let server;
const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

app.use(express.json());
app.use(requestId);
app.use(metricsMiddleware);

const redis = createRedisClient(config.redisUrl);
const kafka = createKafkaClient(config.serviceName, config.kafkaBrokers);

async function bootstrap() {
  // Listen for events that should trigger notifications
  await createConsumer(kafka, config.serviceName, ['game-events'], async ({ message }) => {
    try {
      const data = JSON.parse(message.value.toString());
      const { eventType, userId } = data;

      let notification = null;
      if (eventType === 'GAME_SCORED') {
        notification = {
          id: Date.now().toString(),
          type: 'achievement',
          message: `Congratulations! You just earned ${data.score} points!`,
          timestamp: new Date().toISOString()
        };
      } else if (eventType === 'QUIZ_COMPLETED') {
        notification = {
          id: Date.now().toString(),
          type: 'quiz_result',
          message: `Quiz completed! Score: ${data.score} (${data.correctAnswers}/${data.totalQuestions})`,
          timestamp: new Date().toISOString()
        };
      }

      if (notification) {
        // Store in Redis (list of last 20 notifications)
        const key = `notifications:${userId}`;
        await redis.lpush(key, JSON.stringify(notification));
        await redis.ltrim(key, 0, 19);
        logger.info({ msg: 'Notification created', userId, type: eventType });
      }
    } catch (err) {
      logger.error({ msg: 'Failed to process notification event', error: err.message });
    }
  });

  // Health & metrics
  app.get('/metrics', metricsHandler);
  app.use('/', healthRoutes(config.serviceName, null, redis));

  const auth = authMiddleware(config.jwtSecret);

  // Get notifications for the logged-in user
  app.get('/notifications', auth, async (req, res, next) => {
    try {
      const key = `notifications:${req.userId}`;
      const notifications = await redis.lrange(key, 0, -1);
      res.json({ notifications: notifications.map(n => JSON.parse(n)) });
    } catch (err) {
      next(err);
    }
  });

  app.use(errorHandler);
  server = app.listen(config.port, () => logger.info({ msg: `Notification service listening`, port: config.port }));
}

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ msg: `${signal} — shutting down` });
  await new Promise((resolve) => server ? server.close(resolve) : resolve());
  await redis?.quit();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch(err => {
  logger.fatal({ msg: 'Startup failed', error: err.message });
  process.exit(1);
});
