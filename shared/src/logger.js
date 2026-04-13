'use strict';

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  isDev
    ? {
        transport: {
          target: 'pino-pretty',
        },
      }
    : {}
);

module.exports = logger;
