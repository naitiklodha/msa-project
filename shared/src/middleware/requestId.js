'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Propagate or generate x-request-id on every request.
 */
module.exports = (req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.requestId);
  next();
};
