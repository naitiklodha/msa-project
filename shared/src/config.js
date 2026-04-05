'use strict';

// ── Validate required env vars at import time ──────────────────
const required = [
  'KAFKA_BROKERS',
  'REDIS_URL',
  'PG_CONNECTION_STRING',
  'JWT_SECRET',
  'SERVICE_NAME',
];

required.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
});

module.exports = {
  serviceName:        process.env.SERVICE_NAME,
  port:               parseInt(process.env.PORT || '3000', 10),
  nodeEnv:            process.env.NODE_ENV || 'development',
  kafkaBrokers:       process.env.KAFKA_BROKERS.split(','),
  redisUrl:           process.env.REDIS_URL,
  pgConnectionString: process.env.PG_CONNECTION_STRING,
  jwtSecret:          process.env.JWT_SECRET,
  jwtExpiry:          process.env.JWT_EXPIRY || '15m',
  jwtRefreshExpiry:   process.env.JWT_REFRESH_EXPIRY || '7d',
  jaegerEndpoint:     process.env.JAEGER_ENDPOINT || '',
};
