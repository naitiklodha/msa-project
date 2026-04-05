'use strict';

const config = require('./config');
const logger = require('./logger');
const { createKafkaClient, createProducer, createConsumer } = require('./kafka');
const { createPgPool, query } = require('./db/postgres');
const { createRedisClient } = require('./db/redis');
const createMetrics = require('./middleware/metrics');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const { authMiddleware, requireRole } = require('./middleware/auth');
const { CircuitBreaker } = require('./resilience/circuitBreaker');
const idempotency = require('./middleware/idempotency');
const healthRoutes = require('./routes/health');

module.exports = {
  config,
  logger,
  createKafkaClient,
  createProducer,
  createConsumer,
  createPgPool,
  query,
  createRedisClient,
  createMetrics,
  errorHandler,
  requestId,
  authMiddleware,
  requireRole,
  CircuitBreaker,
  idempotency,
  healthRoutes,
};
