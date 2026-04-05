'use strict';

const Redis = require('ioredis');
const logger = require('../logger');

/**
 * Create a Redis client with automatic reconnection.
 */
function createRedisClient(url) {
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.error({ msg: 'Redis error', error: err.message }));

  return client;
}

module.exports = { createRedisClient };
