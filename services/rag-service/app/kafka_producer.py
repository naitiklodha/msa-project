import json
import logging
from kafka import KafkaProducer
from .config import KAFKA_BROKERS

logger = logging.getLogger(__name__)

_producer = None

def get_kafka_producer():
    global _producer
    if _producer is None:
        try:
            _producer = KafkaProducer(
                bootstrap_servers=KAFKA_BROKERS.split(","),
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                # Add retries and other production configs if needed
                retries=5
            )
            logger.info("Kafka producer initialized with brokers: %s", KAFKA_BROKERS)
        except Exception as e:
            logger.error("Failed to initialize Kafka producer: %s", e)
            # In some cases, you might want to allow the service to start even if Kafka is down
            # but for this integration, we need it.
            return None
    return _producer

def emit_event(topic: str, event_type: str, data: dict):
    producer = get_kafka_producer()
    if producer:
        # Standardizing on a flat structure that game-service expects
        event = {
            "eventType": event_type,
            **data
        }
        try:
            producer.send(topic, event)
            producer.flush()
            logger.info("Emitted %s event to topic %s", event_type, topic)
        except Exception as e:
            logger.error("Failed to emit event: %s", e)
    else:
        logger.warning("Kafka producer not available. Event %s NOT emitted.", event_type)
