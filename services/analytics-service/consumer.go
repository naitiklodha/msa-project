package main

import (
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

// KafkaEvent represents a FocusPulse event from any topic.
type KafkaEvent struct {
	EventID   string          `json:"eventId"`
	EventType string          `json:"eventType"`
	Source    string          `json:"source"`
	UserID   string          `json:"userId"`
	Timestamp string         `json:"timestamp"`
	Raw       json.RawMessage `json:"-"`
}

// StartConsumer connects to Kafka and ingests events into Postgres.
// It subscribes to user-events, game-events and timer-events.
func StartConsumer() {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		brokers = "kafka:9092"
	}

	c, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers":  brokers,
		"group.id":           "focuspulse-analytics-cg",
		"auto.offset.reset":  "earliest",
		"session.timeout.ms": 30000,
		"enable.auto.commit": true,
	})
	if err != nil {
		log.Fatalf("[analytics] Kafka consumer creation failed: %v", err)
	}

	topics := []string{"user-events", "game-events", "timer-events"}
	if err := c.SubscribeTopics(topics, nil); err != nil {
		log.Fatalf("[analytics] Failed to subscribe: %v", err)
	}

	log.Printf("[analytics] Kafka consumer started — listening on %v", topics)

	// Graceful shutdown on signal
	sigchan := make(chan os.Signal, 1)
	signal.Notify(sigchan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigchan
		log.Println("[analytics] Shutting down consumer…")
		c.Close()
		os.Exit(0)
	}()

	// Poll loop
	for {
		msg, err := c.ReadMessage(-1)
		if err != nil {
			log.Printf("[analytics] Consumer error: %v", err)
			continue
		}

		processMessage(msg)
	}
}

func processMessage(msg *kafka.Message) {
	var evt KafkaEvent
	if err := json.Unmarshal(msg.Value, &evt); err != nil {
		log.Printf("[analytics] Bad message on %s: %v", *msg.TopicPartition.Topic, err)
		return
	}

	// Store the full message as the payload JSON
	payloadStr := string(msg.Value)

	if err := InsertEvent(evt.EventID, evt.EventType, evt.Source, evt.UserID, payloadStr); err != nil {
		log.Printf("[analytics] DB insert failed for %s: %v", evt.EventID, err)
		return
	}

	log.Printf("[analytics] Ingested %s from %s (user=%s)", evt.EventType, evt.Source, evt.UserID)
}
