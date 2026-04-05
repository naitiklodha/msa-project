'use strict';

const express = require('express');
const { config, logger, requestId, createMetrics, errorHandler, healthRoutes } = require('@focuspulse/shared');
const axios = require('axios');

const app = express();
const { metricsMiddleware, metricsHandler } = createMetrics(config.serviceName);

app.use(express.json());
app.use(requestId);
app.use(metricsMiddleware);

// Health checks (passing nulls for DBs as BFF is stateless/aggregator)
app.use('/', healthRoutes(config.serviceName, null, null));

// Aggregation logic
app.get('/api/dashboard', async (req, res, next) => {
  try {
    // In a real system, these would use the CircuitBreaker shared utility
    // const [game, quiz] = await Promise.all([
    //   axios.get(`${process.env.GAME_SERVICE_URL}/status`, { headers: { 'x-request-id': req.requestId } }),
    //   axios.get(`${process.env.QUIZ_SERVICE_URL}/status`, { headers: { 'x-request-id': req.requestId } })
    // ]);

    res.json({
      message: 'BFF Aggregated Data Skeleton',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

app.get('/metrics', metricsHandler);
app.use(errorHandler);

app.listen(config.port, () => logger.info({ msg: `BFF listening`, port: config.port }));
