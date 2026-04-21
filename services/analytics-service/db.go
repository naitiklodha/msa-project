package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)


var db *sql.DB

// InitDB opens a Postgres connection pool and ensures the analytics table exists.
func InitDB() {
	connStr := os.Getenv("PG_CONNECTION_STRING")
	if connStr == "" {
		log.Fatal("[analytics] Missing PG_CONNECTION_STRING")
	}

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("[analytics] Failed to open DB: %v", err)
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	// Retry loop for initial connection
	maxRetries := 10
	for i := 0; i < maxRetries; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		log.Printf("[analytics] Waiting for Postgres (%d/%d)...", i+1, maxRetries)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("[analytics] Cannot reach Postgres after retries: %v", err)
	}


	// Auto-create table if it doesn't exist (idempotent)
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS analytics_events (
			id          SERIAL PRIMARY KEY,
			event_id    TEXT UNIQUE NOT NULL,
			event_type  TEXT NOT NULL,
			source      TEXT NOT NULL,
			user_id     TEXT,
			payload     JSONB DEFAULT '{}',
			created_at  TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE INDEX IF NOT EXISTS idx_analytics_user   ON analytics_events(user_id);
		CREATE INDEX IF NOT EXISTS idx_analytics_type   ON analytics_events(event_type);
		CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
	`)
	if err != nil {
		log.Fatalf("[analytics] Failed to ensure table: %v", err)
	}

	log.Println("[analytics] Postgres connected")
}

// InsertEvent stores a Kafka event in the analytics table (idempotent via event_id).
func InsertEvent(eventID, eventType, source, userID, payload string) error {
	_, err := db.Exec(`
		INSERT INTO analytics_events (event_id, event_type, source, user_id, payload)
		VALUES ($1, $2, $3, $4, $5::jsonb)
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, eventType, source, userID, payload)
	return err
}

// OverviewStats holds system-wide metrics.
type OverviewStats struct {
	TotalUsers     int `json:"total_users"`
	TotalSessions  int `json:"total_sessions"`
	TotalQuizzes   int `json:"total_quizzes"`
	TotalScored    int `json:"total_scored"`
	ActiveToday    int `json:"active_today"`
	EventsIngested int `json:"events_ingested"`
}

// GetOverview queries aggregated system stats.
func GetOverview() (*OverviewStats, error) {
	s := &OverviewStats{}

	err := db.QueryRow(`SELECT COUNT(*) FROM analytics_events`).Scan(&s.EventsIngested)
	if err != nil {
		return nil, fmt.Errorf("events count: %w", err)
	}

	_ = db.QueryRow(`SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE event_type = 'USER_REGISTERED'`).Scan(&s.TotalUsers)
	_ = db.QueryRow(`SELECT COUNT(*) FROM analytics_events WHERE event_type = 'TIMER_COMPLETED'`).Scan(&s.TotalSessions)
	_ = db.QueryRow(`SELECT COUNT(*) FROM analytics_events WHERE event_type = 'QUIZ_COMPLETED'`).Scan(&s.TotalQuizzes)
	_ = db.QueryRow(`SELECT COUNT(*) FROM analytics_events WHERE event_type = 'GAME_SCORED'`).Scan(&s.TotalScored)
	_ = db.QueryRow(`SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at > NOW() - INTERVAL '24 hours'`).Scan(&s.ActiveToday)

	return s, nil
}

// UserStats holds per-user analytics.
type UserStats struct {
	UserID          string         `json:"user_id"`
	SessionCount    int            `json:"session_count"`
	QuizCount       int            `json:"quiz_count"`
	TotalScored     int            `json:"total_scored"`
	RecentEvents    []RecentEvent  `json:"recent_events"`
}

// RecentEvent is a simplified event for the user timeline.
type RecentEvent struct {
	EventType string `json:"event_type"`
	CreatedAt string `json:"created_at"`
}

// GetUserStats queries analytics for a specific user.
func GetUserStats(userID string) (*UserStats, error) {
	s := &UserStats{UserID: userID}

	_ = db.QueryRow(`SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'TIMER_COMPLETED'`, userID).Scan(&s.SessionCount)
	_ = db.QueryRow(`SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'QUIZ_COMPLETED'`, userID).Scan(&s.QuizCount)
	_ = db.QueryRow(`SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'GAME_SCORED'`, userID).Scan(&s.TotalScored)

	rows, err := db.Query(`
		SELECT event_type, created_at::text
		FROM analytics_events
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 20
	`, userID)
	if err != nil {
		return s, nil // return partial data
	}
	defer rows.Close()

	for rows.Next() {
		var e RecentEvent
		if err := rows.Scan(&e.EventType, &e.CreatedAt); err == nil {
			s.RecentEvents = append(s.RecentEvents, e)
		}
	}

	return s, nil
}
