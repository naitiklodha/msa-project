'use strict';

const express = require('express');

/**
 * Setting up the health check routes. 
 * /health/live — standard liveness check (just returns 200)
 * /health/ready — readiness check (actually pings PG and Redis)
 */
function healthRoutes(serviceName, pgPool, redisClient) {
  const router = express.Router();

  // This root handler is here so Kong's health check can just hit the service 
  // prefix and get a response without us having to map every specific path.
  router.get('/', (_req, res) => {
    res.json({ status: 'ok', service: serviceName, path: 'root' });
  });

  const live = (_req, res) => {
    res.json({ status: 'ok', service: serviceName });
  };

  router.get('/health/live', live);
  router.get('/healthz', live);

  const ready = async (_req, res) => {
    const checks = {};

    try {
      if (pgPool) {
        await pgPool.query('SELECT 1');
        checks.postgres = 'ok';
      }
    } catch (e) {
      checks.postgres = e.message;
    }

    try {
      if (redisClient) {
        await redisClient.ping();
        checks.redis = 'ok';
      }
    } catch (e) {
      checks.redis = e.message;
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ready' : 'not ready',
      service: serviceName,
      checks,
    });
  };

  router.get('/health/ready', ready);
  router.get('/readyz', ready);

  return router;
}

module.exports = healthRoutes;
