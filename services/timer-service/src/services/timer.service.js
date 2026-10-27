'use strict';

const { logger } = require('@focuspulse/shared');

/**
 * Timer service handles Pomodoro focus sessions.
 * The actual countdown happens on the frontend. We just store
 * when sessions start and end, and emit events when they complete.
 */
function timerService({ pgPool, redis, produce }) {

  // Start a new focus session for this user
  const startSession = async (userId, durationMinutes = 25) => {
    // Don't let someone start two sessions at once
    const active = await redis.get(`active_session:${userId}`);
    if (active) {
      const err = new Error('You already have an active session');
      err.status = 409;
      throw err;
    }

    const result = await pgPool.query(
      `INSERT INTO focus_sessions (user_id, duration_minutes)
       VALUES ($1, $2) RETURNING id, user_id, duration_minutes, started_at, status`,
      [userId, durationMinutes]
    );

    const session = result.rows[0];

    // Cache the active session in Redis so we can look it up fast
    await redis.set(
      `active_session:${userId}`,
      JSON.stringify({ sessionId: session.id, startedAt: session.started_at }),
      'EX',
      durationMinutes * 60 + 300 // auto-expire a bit after the session should end
    );

    // Emit timer event for analytics
    await produce('timer-events', 'FOCUS_SESSION_STARTED', {
      userId: session.user_id,
      sessionId: session.id,
      durationMinutes: session.duration_minutes,
    });

    logger.info({ msg: 'Focus session started', userId, sessionId: session.id });
    return session;
  };

  // Check if the user has something running right now
  const getActiveSession = async (userId) => {
    const cached = await redis.get(`active_session:${userId}`);
    if (!cached) return null;

    const { sessionId } = JSON.parse(cached);

    // Double-check against Postgres in case Redis and PG got out of sync
    const result = await pgPool.query(
      `SELECT id, user_id, duration_minutes, started_at, status
       FROM focus_sessions WHERE id = $1 AND status = 'active'`,
      [sessionId]
    );

    return result.rows[0] || null;
  };

  // Mark a session as completed and let the rest of the system know
  const completeSession = async (userId, sessionId) => {
    const result = await pgPool.query(
      `UPDATE focus_sessions
       SET status = 'completed', completed_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING id, user_id, duration_minutes, started_at, completed_at`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      const err = new Error('No active session found with that ID');
      err.status = 404;
      throw err;
    }

    const session = result.rows[0];

    // Clean up the Redis cache
    await redis.del(`active_session:${userId}`);

    // This is the event that kicks off the scoring chain
    await produce('game-events', 'FOCUS_SESSION_COMPLETED', {
      userId: session.user_id,
      sessionId: session.id,
      durationMinutes: session.duration_minutes,
    });

    // Emit timer event for analytics
    await produce('timer-events', 'FOCUS_SESSION_COMPLETED', {
      userId: session.user_id,
      sessionId: session.id,
      durationMinutes: session.duration_minutes,
    });

    logger.info({ msg: 'Focus session completed', userId, sessionId });
    return session;
  };

  // Quit early. No shame, but no reward.
  const abandonSession = async (userId, sessionId) => {
    const result = await pgPool.query(
      `UPDATE focus_sessions
       SET status = 'abandoned', completed_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING id, status`,
      [sessionId, userId]
    );

    if (result.rows.length === 0) {
      const err = new Error('No active session found with that ID');
      err.status = 404;
      throw err;
    }

    await redis.del(`active_session:${userId}`);

    // Emit timer event for analytics
    await produce('timer-events', 'FOCUS_SESSION_ABANDONED', {
      userId,
      sessionId,
    });

    logger.info({ msg: 'Focus session abandoned', userId, sessionId });
    return result.rows[0];
  };

  // Get a user's session history
  const getHistory = async (userId, limit = 20) => {
    const result = await pgPool.query(
      `SELECT id, duration_minutes, started_at, completed_at, status
       FROM focus_sessions WHERE user_id = $1
       ORDER BY started_at DESC LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  };

  return { startSession, getActiveSession, completeSession, abandonSession, getHistory };
}

module.exports = timerService;
