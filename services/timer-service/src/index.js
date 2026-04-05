'use strict';

const express = require('express');
const { config, logger, requestId, createMetrics, errorHandler, healthRoutes, createPgPool, createRedisClient, createKafkaClient, createProducer } = require('@focuspulse/shared');

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

  app.get('/timer/status', (req, res) => {
    res.json({ message: 'Timer status' });
  });

  app.use(errorHandler);
  app.listen(config.port, () => logger.info({ msg: `Timer service listening`, port: config.port }));
}

bootstrap().catch(err => logger.fatal(err));
