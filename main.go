package main

import (
	"database/sql"
	"log"

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

	mux := initRoutes(db, c)
	startServer(mux)
}

func startCronTests(db *sql.DB) *cron.Cron {
	c := cron.New()

	// Run a speedtest every minute and store results
	c.AddFunc("* * * * *", func() {
		log.Println("Speedtest started...")
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
