'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT validation middleware.
 * In production, Kong validates the token and forwards x-user-id / x-user-role.
 * This middleware is a fallback / dev-mode validator.
 */
function authMiddleware(jwtSecret) {
  return (req, res, next) => {
    // If Kong already validated and injected headers, trust them
    if (req.headers['x-user-id']) {
      req.userId = req.headers['x-user-id'];
      req.userRole = req.headers['x-user-role'] || 'user';
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret);
      req.userId = decoded.sub;
      req.userRole = decoded.role || 'user';
      next();
    } catch (err) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
}

/**
 * RBAC middleware — requires one of the specified roles.
 * Usage: router.get('/admin', requireRole('admin', 'superadmin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Requires one of roles: ${roles.join(', ')}`,
          requestId: req.requestId,
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
