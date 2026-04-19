'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config, logger } = require('@focuspulse/shared');

/**
 * The real auth logic. No more mocks.
 * Talks to Postgres for user storage and bcrypt for password hashing.
 */
function authService({ pgPool, redis, produce }) {

  const login = async (email, password) => {
    // Look up the user by email
    const result = await pgPool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    // Check the password against the stored hash
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    const payload = { sub: user.id, role: user.role, email: user.email };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '1h',
      issuer: 'focuspulse',
    });

    // Let Kafka know someone logged in
    await produce('user-events', 'USER_LOGIN', {
      userId: user.id,
      email: user.email,
    });

    logger.info({ msg: 'User logged in', userId: user.id });
    return { accessToken: token };
  };

  const register = async (email, password, role = 'user') => {
    // Check if this email is already taken
    const existing = await pgPool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      const err = new Error('Email already registered');
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert the new user and get the generated UUID back
    const result = await pgPool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, passwordHash, role]
    );

    const user = result.rows[0];

    const payload = { sub: user.id, role: user.role, email: user.email };
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: '1h',
      issuer: 'focuspulse',
    });

    // Tell the rest of the system about the new user
    await produce('user-events', 'USER_REGISTERED', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info({ msg: 'User registered', userId: user.id });
    return { userId: user.id, accessToken: token };
  };

  return { login, register };
}

module.exports = authService;
