package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.Println("[analytics] Starting analytics-service…")

	// 1. Connect to Postgres
	InitDB()

	// 2. Start Kafka consumer in background goroutine
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	go StartConsumer(ctx)

	// 3. HTTP server for REST endpoints
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", HealthHandler)
	mux.HandleFunc("/health/live", HealthHandler)
	mux.HandleFunc("/health/ready", HealthHandler)
	mux.HandleFunc("/overview", OverviewHandler)
	mux.HandleFunc("/user/", UserStatsHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[analytics] HTTP server listening on %s", addr)

	server := &http.Server{Addr: addr, Handler: mux}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[analytics] Server failed: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("[analytics] HTTP shutdown failed: %v", err)
	}
	if db != nil {
		_ = db.Close()
	}
}
