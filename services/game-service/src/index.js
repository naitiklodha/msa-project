'use strict';

const express = require('express');
const { config, logger, createKafkaClient, createProducer, createPgPool, createRedisClient, createMetrics, errorHandler, requestId, healthRoutes, authMiddleware } = require('@focuspulse/shared');

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

  app.get('/metrics', metricsHandler);
  app.use('/', healthRoutes(config.serviceName, pgPool, redis));

  // Protected route example
  app.get('/status', authMiddleware(config.jwtSecret), (req, res) => {
    res.json({ status: 'active', userId: req.userId });
  });

  app.use(errorHandler);
  app.listen(config.port, () => logger.info({ msg: `Game service listening`, port: config.port }));
}

bootstrap().catch(err => logger.fatal(err));
