'use strict';

/**
 * Idempotency middleware using Redis.
 * Checks if a request with the same Idempotency-Key has already been processed.
 *
 * Usage: app.use('/api', idempotency(redisClient))
 */
function idempotency(redis, ttlSeconds = 86400) {
  return async (req, res, next) => {
    const idempotencyKey = req.headers['idempotency-key'];

    // Only enforce on mutating methods
    if (!idempotencyKey || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const redisKey = `idempotency:${idempotencyKey}`;

    try {
      const existing = await redis.get(redisKey);

      if (existing) {
        const cached = JSON.parse(existing);
        return res.status(cached.statusCode).json(cached.body);
      }

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        redis
          .set(
            redisKey,
            JSON.stringify({ statusCode: res.statusCode, body }),
            'EX',
            ttlSeconds
          )
          .catch(() => {}); // best-effort caching
        return originalJson(body);
      };

      next();
    } catch (err) {
      // Redis failure should not block the request
      next();
    }
  };
}

module.exports = idempotency;
