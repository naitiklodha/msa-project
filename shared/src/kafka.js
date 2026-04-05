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
  const consumer = kafka.consumer({
    groupId: `focuspulse-${serviceName}-cg`,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576,
  });

  await consumer.connect();
  await consumer.subscribe({ topics, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await handler({ topic, partition, message });
    },
  });

  logger.info({ msg: 'Kafka consumer running', service: serviceName, topics });
  return consumer;
}

module.exports = { createKafkaClient, createProducer, createConsumer };
