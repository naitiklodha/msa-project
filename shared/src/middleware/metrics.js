'use strict';

const client = require('prom-client');

/**
 * Prometheus metrics middleware + handler factory.
 * Call once per service: const { metricsMiddleware, metricsHandler } = createMetrics(serviceName);
 */
function createMetrics(serviceName) {
  const prefix = `focuspulse_${serviceName.replace(/-/g, '_')}_`;

  // Collect Node.js default metrics (event loop lag, heap, etc.)
  client.collectDefaultMetrics({ prefix });

  const httpDuration = new client.Histogram({
    name: `${prefix}http_duration_seconds`,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  });

  const kafkaEventsProduced = new client.Counter({
    name: `${prefix}kafka_events_produced_total`,
    help: 'Total Kafka events produced',
    labelNames: ['topic', 'event_type'],
  });

  const kafkaEventsConsumed = new client.Counter({
    name: `${prefix}kafka_events_consumed_total`,
    help: 'Total Kafka events consumed',
    labelNames: ['topic', 'event_type', 'status'],
  });

  // Express middleware — track request duration
  function metricsMiddleware(req, res, next) {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      end({
        method: req.method,
        route: req.route ? req.route.path : req.path,
        status_code: res.statusCode,
      });
    });
    next();
  }

  // /metrics endpoint — NOT routed externally via Kong
  async function metricsHandler(_req, res) {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  }

  return {
    metricsMiddleware,
    metricsHandler,
    kafkaEventsProduced,
    kafkaEventsConsumed,
    registry: client.register,
  };
}

module.exports = createMetrics;
