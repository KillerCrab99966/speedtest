package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/netresearch/go-cron"
)

func main() {
	db, err := initDB("results.db")
	if err != nil {
		log.Fatalf("Initialization error: %v", err)
	}
	defer db.Close()

	c := startCronTests(db)
	c.Start()
	defer c.Stop()

	mux := initRoutes(db)
	startServer(mux)
}

func startCronTests(db *sql.DB) *cron.Cron {
	c := cron.New()

	// Run a speedtest every minute and store results
	c.AddFunc("* * * * *", func() {
		results, err := runSpeedtest()
		if err != nil {
			log.Printf("Failed to run speedtest: %v", err)
		}

		for _, r := range results {
			err := saveResult(db, r)
			if err != nil {
				log.Printf("Failed to save result: %v", err)
			}
		}

		log.Println("Speedtest completed and saved")
	})

	return c
}

func startServer(mux *http.ServeMux) {
	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	log.Println("Server listening on:", server.Addr)

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Could not listen on %s: %v\n", server.Addr, err)
	}
}
