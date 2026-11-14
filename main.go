package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/netresearch/go-cron"
	"github.com/spf13/pflag"
	"github.com/spf13/viper"
)

func main() {
	cfg, err := getConfig()
	if err != nil {
		log.Fatalf("Error getting configuration: %v", err)
	}

	db, err := initDB(cfg.DBPath)
	if err != nil {
		log.Fatalf("Initialization error: %v", err)
	}
	defer db.Close()

	c := startCronTests(db, cfg.Schedule, cfg.LibrespeedBinary)
	c.Start()
	defer c.Stop()

	mux := initRoutes(db, c)
	startServer(mux, cfg.Addr)
}

type Config struct {
	Addr             string `mapstructure:"address"`
	Schedule         string `mapstructure:"schedule"`
	DBPath           string `mapstructure:"database"`
	LibrespeedBinary string `mapstructure:"librespeed_bin"`
}

func getConfig() (Config, error) {
	pflag.StringP("address", "a", "127.0.0.1:8080", "Address to bind server to")
	pflag.StringP("schedule", "s", "6 */2 * * *", "The cron expression to run speedtests on")
	pflag.StringP("database", "d", "./results.db", "The path to the SQLite database")
	pflag.StringP("librespeed_bin", "b", "speedtest-cli", "The path to the LibreSpeed CLI")

	pflag.Parse()

	viper.SetDefault("address", "127.0.0.1:8080")
	viper.SetDefault("schedule", "6 */2 * * *")
	viper.SetDefault("database", "./results.db")
	viper.SetDefault("librespeed_bin", "speedtest-cli")

	viper.BindPFlags(pflag.CommandLine)

	viper.SetConfigName("config")

	viper.AddConfigPath(".")
	if userConfigDir, err := os.UserConfigDir(); err == nil {
		appConfigDir := filepath.Join(userConfigDir, "speedtest-server")
		viper.AddConfigPath(appConfigDir)
	}

	viper.SetEnvPrefix("SPEEDTEST")
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Println("No config file found.")
		} else {
			return Config{}, fmt.Errorf("failed to read config file: %w", err)
		}
	} else {
		log.Printf("Using config file: %s\n", viper.ConfigFileUsed())
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return Config{}, fmt.Errorf("failed to decode config into struct: %w", err)
	}

	return cfg, nil
}

func startCronTests(db *sql.DB, schedule string, binary string) *cron.Cron {
	c := cron.New()

	// Run a speedtest every minute and store results
	c.AddFunc(schedule, func() {
		log.Println("Speedtest started...")
		results, err := runSpeedtest(binary)
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
