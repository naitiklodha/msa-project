'use strict';

const logger = require('../logger');

/**
 * Centralized error handler — returns structured JSON responses.
 * Must be registered AFTER all routes: app.use(errorHandler)
 */
module.exports = (err, req, res, _next) => {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  logger.error({
    msg: err.message,
    status,
    requestId: req.requestId,
    stack: isDev ? err.stack : undefined,
  });

  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status < 500 ? err.message : 'An unexpected error occurred',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...(isDev && { stack: err.stack }),
    },
  });
};
