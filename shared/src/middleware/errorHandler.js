'use strict';

const logger = require('../logger');

/**
 * Map HTTP status codes to error codes for 4xx errors
 */
const STATUS_TO_CODE = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
};

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

  // Use explicit error code from err.code, or map from status for 4xx errors, or default to INTERNAL_ERROR
  const code = err.code || (status < 500 ? STATUS_TO_CODE[status] || 'CLIENT_ERROR' : 'INTERNAL_ERROR');

  res.status(status).json({
    error: {
      code,
      message: status < 500 ? err.message : 'An unexpected error occurred',
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      ...(isDev && { stack: err.stack }),
    },
  });
};
