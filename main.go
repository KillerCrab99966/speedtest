package main

import (
	"fmt"

	"github.com/netresearch/go-cron"
)

func main() {
	c := cron.New()

	// Run a speedtest every minute and print results
	c.AddFunc("* * * * *", func() {
		result, err := runSpeedtest()
		if err != nil {
			fmt.Println(err.Error())
		}

		fmt.Println(result)
	})

	c.Start()

	// Keep the program running
	select {}
}
