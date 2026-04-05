'use strict';

const { Pool } = require('pg');
const logger = require('../logger');

/**
 * Create a PG pool. Call once at service startup.
 */
function createPgPool(connectionString) {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    logger.error({ msg: 'Unexpected PG client error', error: err.message });
  });

  return pool;
}

/**
 * Named query wrapper — logs slow queries (>200 ms).
 */
async function query(pool, text, params, name = 'unnamed') {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 200) {
    logger.warn({ msg: `Slow query "${name}"`, duration });
  }
  return res;
}

module.exports = { createPgPool, query };
