package main

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"time"

	"github.com/netresearch/go-cron"
)

func initRoutes(db *sql.DB, c *cron.Cron) *http.ServeMux {
	mux := http.NewServeMux()

	// API Endpoints
	mux.HandleFunc("GET /api/results", func(w http.ResponseWriter, r *http.Request) {
		handleResults(db, w, r)
	})

	mux.HandleFunc("GET /api/next", func(w http.ResponseWriter, r *http.Request) {
		handleNext(c, w, r)
	})

	// Strip the prefix so files are served relative to root
	subFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatal(err)
	}

	// Static files
	fileServer := http.FileServer(http.FS(subFS))
	mux.Handle("GET /", fileServer)

	return mux
}

func handleResults(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Requested time period
	periodStr := r.URL.Query().Get("period")
	var period time.Duration
	switch periodStr {
	case "24h", "":
		period = 24 * time.Hour
	case "7d":
		period = 7 * 24 * time.Hour
	case "30d":
		period = 30 * 24 * time.Hour
	case "1y":
		period = 365 * 24 * time.Hour
	case "all":
		period = 0
	default:
		period = 24 * time.Hour
	}

	// Get the results from past 24hrs
	results, err := getResultsAsJSON(db, period)
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

func startServer(mux *http.ServeMux, addr string) {
	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	log.Println("Server listening on:", server.Addr)

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Could not listen on %s: %v\n", server.Addr, err)
	}
}
