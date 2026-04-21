'use strict';

const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Spin up a KafkaJS client.
 */
function createKafkaClient(serviceName, brokers) {
  return new Kafka({
    clientId: `focuspulse-${serviceName}`,
    brokers,
    retry: { initialRetryTime: 300, retries: 10 },
  });
}

/**
 * Get a producer connected. We return the raw producer instance 
 * plus a handy 'produce' wrapper so you don't have to manually 
 * stringify JSON and set UUIDs every time.
 */
async function createProducer(kafka, serviceName) {
  const producer = kafka.producer({
    idempotent: true,
    maxInFlightRequests: 5,
  });

  await producer.connect();
  logger.info({ msg: 'Kafka producer connected', service: serviceName });

  async function produce(topic, eventType, payload, partitionKey = null) {
    const eventId = uuidv4();
    await producer.send({
      topic,
      messages: [
        {
          key: partitionKey || uuidv4(),
          value: JSON.stringify({
            eventId,
            eventType,
            source: serviceName,
            timestamp: new Date().toISOString(),
            ...payload,
          }),
          headers: { 'content-type': 'application/json' },
        },
      ],
    });
    return eventId;
  }

  return { producer, produce };
}

/**
 * Fire up a consumer group. You pass in the topics and a handler function, 
 * and we'll take care of the connection and subscription boilerplate.
 */
async function createConsumer(kafka, serviceName, topics, handler) {
  const MAX_RETRIES = 10;
  const BASE_DELAY = 3000; // 3 seconds

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Ensure topics exist before subscribing — idempotent approach 
      // to silence harmless 'Topic creation errors' in logs.
      const admin = kafka.admin();
      await admin.connect();
      try {
        const existingTopics = await admin.listTopics();
        const missingTopics = topics.filter(t => !existingTopics.includes(t));
        
        if (missingTopics.length > 0) {
          await admin.createTopics({
            waitForLeaders: true,
            topics: missingTopics.map(t => ({ topic: t, numPartitions: 1, replicationFactor: 1 })),
          });
          logger.info({ msg: 'Created missing Kafka topics', service: serviceName, missingTopics });
        }
      } catch (err) {
        logger.warn({ msg: 'Optional topic creation failed', detail: err.message });
      } finally {
        await admin.disconnect();
      }

      const consumer = kafka.consumer({
        groupId: `focuspulse-${serviceName}-cg`,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        maxBytesPerPartition: 1048576,
      });

      await consumer.connect();
      await consumer.subscribe({ topics, fromBeginning: true });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await handler({ topic, partition, message });
        },
      });

      logger.info({ msg: 'Kafka consumer running', service: serviceName, topics });
      return consumer;
    } catch (err) {
      logger.warn({
        msg: `Kafka consumer setup failed (attempt ${attempt}/${MAX_RETRIES})`,
        service: serviceName,
        error: err.message,
      });
      if (attempt === MAX_RETRIES) throw err;
      const delay = BASE_DELAY * attempt;
      logger.info({ msg: `Retrying in ${delay}ms...` });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = { createKafkaClient, createProducer, createConsumer };
