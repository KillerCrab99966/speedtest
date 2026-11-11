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

	startCronTests(db)

	// Keep the program running
	select {}
}

func startCronTests(db *sql.DB) {
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

	c.Start()
}
