package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	log.Println("[analytics] Starting analytics-service…")

	// 1. Connect to Postgres
	InitDB()

	// 2. Start Kafka consumer in background goroutine
	go StartConsumer()

	// 3. HTTP server for REST endpoints
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", HealthHandler)
	mux.HandleFunc("/overview", OverviewHandler)
	mux.HandleFunc("/user/", UserStatsHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[analytics] HTTP server listening on %s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[analytics] Server failed: %v", err)
	}
}
