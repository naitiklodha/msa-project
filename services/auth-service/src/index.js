'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {
  config,
  logger,
  createKafkaClient,
  createProducer,
  createPgPool,
  createRedisClient,
  createMetrics,
  errorHandler,
  requestId,
  healthRoutes,
} = require('@focuspulse/shared');

const authService = require('./services/auth.service');

const app = express();
let server;

// ── Middleware ──
const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());
app.use(requestId);
app.use(metricsMiddleware);

// ── Dependencies ──
const pgPool = createPgPool(config.pgConnectionString);
const redis = createRedisClient(config.redisUrl);
const kafka = createKafkaClient(config.serviceName, config.kafkaBrokers);

let kafkaProducer;

// ── Startup ──
async function bootstrap() {
  const { producer, produce } = await createProducer(kafka, config.serviceName);
  kafkaProducer = producer;

  // Initialize Auth Logic
  const service = authService({ pgPool, redis, produce });

  // ── Routes ──
  app.get('/metrics', metricsHandler);
  app.use('/', healthRoutes(config.serviceName, pgPool, redis));

  app.post('/login', async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Email and password are required' } });
      }
      const result = await service.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  app.post('/register', async (req, res, next) => {
    try {
      const { email, password, role } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Email and password are required' } });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Password must be at least 6 characters' } });
      }
      const result = await service.register(email, password, role);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // ── Error Handling ──
  app.use(errorHandler);

  server = app.listen(config.port, () => {
    logger.info({ msg: `Auth service listening`, port: config.port });
  });
}

// ── Graceful Shutdown ──
const shutdown = async (signal) => {
  logger.info({ msg: `${signal} — shutting down` });
  await new Promise((resolve) => server ? server.close(resolve) : resolve());
  await Promise.allSettled([
    kafkaProducer?.disconnect(),
    pgPool?.end(),
    redis?.quit(),
  ]);
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch((err) => {
  logger.fatal({ msg: 'Startup failed', error: err.message });
  process.exit(1);
});
