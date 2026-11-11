package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/netresearch/go-cron"
)

func initRoutes(db *sql.DB, c *cron.Cron) *http.ServeMux {
	mux := http.NewServeMux()

	// Endpoints
	mux.HandleFunc("GET /api/results", func(w http.ResponseWriter, r *http.Request) {
		handleResults(db, w, r)
	})

	mux.HandleFunc("GET /api/next", func(w http.ResponseWriter, r *http.Request) {
		handleNext(c, w, r)
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

func handleNext(c *cron.Cron, w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain")

	// There will only ever be one job, so it is
	// safe to take the first (and only) element
	fmt.Fprint(w, c.Entries()[0].Next.Format(time.RFC3339))
}
