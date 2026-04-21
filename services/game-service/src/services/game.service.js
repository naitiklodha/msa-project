'use strict';

const { logger } = require('@focuspulse/shared');

/**
 * Game service handles scoring and streak tracking.
 * It listens for events from other services (timer, quiz) and
 * awards points accordingly. Then emits GAME_SCORED so the
 * leaderboard consumer can update Redis.
 */
function gameService({ pgPool, redis, produce }) {

  // Award points for completing a focus session
  const scoreFocusSession = async (userId, durationMinutes) => {
    // Base score: 10 points per session, plus a bonus for longer ones
    let score = 10;
    if (durationMinutes >= 45) score = 20;
    else if (durationMinutes >= 30) score = 15;

    // Check the streak: how many consecutive days has this user completed a session?
    const streak = await calculateStreak(userId);

    // Streak bonus: 3+ days in a row gets you extra points
    let streakBonus = 0;
    if (streak >= 7) streakBonus = 50;
    else if (streak >= 5) streakBonus = 30;
    else if (streak >= 3) streakBonus = 15;

    const totalScore = score + streakBonus;

    // Record the score
    await pgPool.query(
      `INSERT INTO game_scores (user_id, score, streak, source) VALUES ($1, $2, $3, $4)`,
      [userId, totalScore, streak, 'focus_session']
    );

    // Emit the score event so the leaderboard picks it up
    await produce('game-events', 'GAME_SCORED', {
      userId,
      score: totalScore,
      streak,
      source: 'focus_session',
    });

    logger.info({ msg: 'Focus session scored', userId, score: totalScore, streak });
    return { score: totalScore, streak, streakBonus };
  };

  // Award points for completing a quiz (Person 1 will emit QUIZ_COMPLETED)
  const scoreQuiz = async (userId, correctAnswers, totalQuestions) => {
    const score = correctAnswers * 5;

    await pgPool.query(
      `INSERT INTO game_scores (user_id, score, streak, source) VALUES ($1, $2, 0, $3)`,
      [userId, score, 'quiz_completed']
    );

    await produce('game-events', 'GAME_SCORED', {
      userId,
      score,
      streak: 0,
      source: 'quiz_completed',
    });

    logger.info({ msg: 'Quiz scored', userId, score, correctAnswers, totalQuestions });
    return { score };
  };

  // Award points for completing a micro game
  const scoreMiniGame = async (userId, gameName, rawScore) => {
    let score = 0;
    
    // Scaling points down so you don't inflate the global leaderboard instantly
    if (gameName === '2048') {
      score = Math.floor(rawScore / 100); 
    } else if (gameName === 'snake') {
      score = Math.floor(rawScore / 5);
    } else {
      score = 5; // Flat score for unknown games
    }

    if (score > 0) {
      await pgPool.query(
        `INSERT INTO game_scores (user_id, score, streak, source) VALUES ($1, $2, 0, $3)`,
        [userId, score, `minigame_${gameName}`]
      );

      await produce('game-events', 'GAME_SCORED', {
        userId,
        score,
        streak: 0,
        source: `minigame_${gameName}`,
      });

      logger.info({ msg: 'Mini game scored', userId, gameName, rawScore, awardedScore: score });
    }

    return { score };
  };

  // Figure out how many consecutive days the user has completed at least one session
  const calculateStreak = async (userId) => {
    const result = await pgPool.query(
      `SELECT DISTINCT DATE(created_at) as day
       FROM game_scores
       WHERE user_id = $1 AND source = 'focus_session'
       ORDER BY day DESC
       LIMIT 30`,
      [userId]
    );

    if (result.rows.length === 0) return 1; // first session today counts as day 1

    let streak = 1;
    const days = result.rows.map(r => new Date(r.day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if the most recent score was today or yesterday
    const lastDay = days[0];
    lastDay.setHours(0, 0, 0, 0);
    const diffFromToday = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
    if (diffFromToday > 1) return 1; // streak is broken

    // Count consecutive days going backward
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]);
      const curr = new Date(days[i]);
      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);
      const diff = Math.floor((prev - curr) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  // Get a user's scores and stats
  const getUserStats = async (userId) => {
    const totalResult = await pgPool.query(
      `SELECT COALESCE(SUM(score), 0) as total_score, COUNT(*) as total_sessions
       FROM game_scores WHERE user_id = $1`,
      [userId]
    );

    const streak = await calculateStreak(userId);

    const recentResult = await pgPool.query(
      `SELECT score, streak, source, created_at
       FROM game_scores WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    return {
      totalScore: parseInt(totalResult.rows[0].total_score),
      totalSessions: parseInt(totalResult.rows[0].total_sessions),
      currentStreak: streak,
      recentScores: recentResult.rows,
    };
  };

  return { scoreFocusSession, scoreQuiz, scoreMiniGame, getUserStats, calculateStreak };
}

module.exports = gameService;
