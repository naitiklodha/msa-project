'use strict';

const express = require('express');
const { config, logger, requestId, metricsMiddleware: _m, metricsHandler: _h, createMetrics, errorHandler, healthRoutes, createPgPool, createRedisClient, createKafkaClient, createProducer } = require('@focuspulse/shared');

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

  app.get('/quiz/start', (req, res) => {
    res.json({ message: 'Quiz started' });
  });

  app.use(errorHandler);
  app.listen(config.port, () => logger.info({ msg: `Quiz service listening`, port: config.port }));
}

bootstrap().catch(err => logger.fatal(err));
