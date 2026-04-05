'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config } = require('@focuspulse/shared');

/**
 * This is where all the actual auth magic happens—hashing passwords, 
 * signing tokens, and letting the rest of the system know when a 
 * new user shows up.
 */
function authService({ pgPool, redis, produce }) {
  const login = async (email, password) => {
    // I'm just mocking the DB check for now. Later on, we'll swap this out
    // for a real Postgres query like:
    // const user = await pgPool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (email === 'admin@focuspulse.com' && password === 'password') {
      const payload = { sub: 'admin-123', role: 'admin', email };
      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h', issuer: 'focuspulse' });

      // Let Kafka know someone logged in. Useful for auditing or analytics.
      await produce('user-events', 'USER_LOGIN', { userId: 'admin-123', email });

      return { accessToken: token };
    }

    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  };

  const register = async (email, password, role = 'user') => {
    // 1. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // We'll need to save this to Postgres once the schema is live.
    // await pgPool.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [email, hashedPassword, role]);

    const userId = `user-${Date.now()}`;
    const payload = { sub: userId, role, email };
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h', issuer: 'focuspulse' });

    // Tell the other services to set up a profile for this new user.
    await produce('user-events', 'USER_REGISTERED', { userId, email, role });

    return { userId, accessToken: token };
  };

  return { login, register };
}

module.exports = authService;
