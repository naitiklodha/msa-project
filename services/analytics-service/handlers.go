package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

// HealthHandler returns a simple health check response.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "analytics-service",
	})
}

// OverviewHandler returns system-wide analytics.
func OverviewHandler(w http.ResponseWriter, r *http.Request) {
	stats, err := GetOverview()
	if err != nil {
		http.Error(w, `{"error":"failed to fetch overview"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// UserStatsHandler returns per-user analytics.
// Expects path: /user/{userId}
func UserStatsHandler(w http.ResponseWriter, r *http.Request) {
	// Extract userId from path: /user/some-uuid
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/"), "/")
	if len(parts) < 2 || parts[1] == "" {
		http.Error(w, `{"error":"userId is required"}`, http.StatusBadRequest)
		return
	}
	userID := parts[1]

	stats, err := GetUserStats(userID)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch user stats"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
