'use strict';

const { config, logger, createKafkaClient, createConsumer, createRedisClient } = require('@focuspulse/shared');

const redis = createRedisClient(config.redisUrl);
const kafka = createKafkaClient(config.serviceName, config.kafkaBrokers);

/**
 * This consumer sits in the background and updates the leaderboard
 * whenever something interesting happens. It listens to two topics:
 * - game-events: for GAME_SCORED (update the score)
 * - user-events: for USER_REGISTERED (add them to the board with 0)
 */
async function handleEvent({ topic, message }) {
  try {
    const data = JSON.parse(message.value.toString());
    const { eventType, userId } = data;

    switch (eventType) {
      case 'GAME_SCORED': {
        // Bump their score on the global leaderboard
        await redis.zincrby('leaderboard:global', data.score, userId);
        logger.info({ msg: 'Leaderboard updated', userId, scoreDelta: data.score });
        break;
      }

      case 'USER_REGISTERED': {
        // Add them to the leaderboard so they show up immediately (with 0 points)
        // NX means "only if they don't already exist" — avoids resetting scores
        await redis.zadd('leaderboard:global', 'NX', 0, userId);

        // Store a mapping of userId -> email so we can display names later
        if (data.email) {
          await redis.hset('user:emails', userId, data.email);
        }
        logger.info({ msg: 'New user added to leaderboard', userId });
        break;
      }

      default:
        // We don't care about other event types, just skip them
        break;
    }
  } catch (err) {
    // Log the error but don't crash. The consumer group will move on.
    logger.error({ msg: 'Failed to process event', error: err.message, topic });
  }
}

async function bootstrap() {
  // Listen to both topics
  await createConsumer(kafka, config.serviceName, ['game-events', 'user-events'], handleEvent);
  logger.info({ msg: 'Leaderboard consumer is running' });
}

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info({ msg: `${signal} — shutting down` });
  await redis?.quit();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

bootstrap().catch(err => {
  logger.fatal({ msg: 'Startup failed', error: err.message });
  process.exit(1);
});
