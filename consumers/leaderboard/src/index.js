'use strict';

const { config, logger, createKafkaClient, createConsumer, createRedisClient } = require('@focuspulse/shared');

const redis = createRedisClient(config.redisUrl);
const kafka = createKafkaClient(config.serviceName, config.kafkaBrokers);

async function handleGameEvent({ topic, message }) {
  const data = JSON.parse(message.value.toString());
  const { userId, score, eventType } = data;

  if (eventType === 'GAME_FINISHED') {
    logger.info({ msg: 'Updating leaderboard', userId, score });
    // Atomic ZINCRBY in Redis for leaderboard
    await redis.zincrby('leaderboard:global', score, userId);
  }
}

async function bootstrap() {
  // Consume from game-events topic
  await createConsumer(kafka, config.serviceName, ['game-events'], handleGameEvent);
}

bootstrap().catch(err => logger.fatal(err));
