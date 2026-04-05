'use strict';

const express = require('express');

/**
 * Setting up the health check routes. 
 * /healthz — standard liveness check (just returns 200)
 * /readyz  — readiness check (actually pings PG and Redis)
 */
function healthRoutes(serviceName, pgPool, redisClient) {
  const router = express.Router();

  // This root handler is here so Kong's health check can just hit the service 
  // prefix and get a response without us having to map every specific path.
  router.get('/', (_req, res) => {
    res.json({ status: 'ok', service: serviceName, path: 'root' });
  });

  router.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', service: serviceName });
  });

  router.get('/readyz', async (_req, res) => {
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
  });

  return router;
}

module.exports = healthRoutes;
