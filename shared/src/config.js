'use strict';

function parseCorsOrigins(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return value.split(',').map((origin) => origin.trim()).filter(Boolean);
  }
}

module.exports = {
  serviceName:        process.env.SERVICE_NAME || 'focuspulse-service',
  port:               parseInt(process.env.PORT || '3000', 10),
  nodeEnv:            process.env.NODE_ENV || 'development',
  kafkaBrokers:       process.env.KAFKA_BROKERS?.split(',') || [],
  redisUrl:           process.env.REDIS_URL || '',
  pgConnectionString: process.env.PG_CONNECTION_STRING || '',
  jwtSecret:          process.env.JWT_SECRET || '',
  jwtExpiry:          process.env.JWT_EXPIRY || '15m',
  jwtRefreshExpiry:   process.env.JWT_REFRESH_EXPIRY || '7d',
  jaegerEndpoint:     process.env.JAEGER_ENDPOINT || '',
  corsOrigins:        parseCorsOrigins(process.env.CORS_ORIGINS),
};
