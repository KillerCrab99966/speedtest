package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"
)

func initRoutes(db *sql.DB) *http.ServeMux {
	mux := http.NewServeMux()

	// Endpoints
	mux.HandleFunc("GET /api/results", func(w http.ResponseWriter, r *http.Request) {
		handleResults(db, w, r)
	})

	return mux
}

func handleResults(db *sql.DB, w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get the results from past 24hrs
	results, err := getResultsAsJSON(db, 24*time.Hour)
	if err != nil {
		log.Printf("Error getting results: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		fmt.Fprintf(w, `{error:"%v"}`, err)
		return
	}

	fmt.Fprint(w, string(results))
}
