package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "modernc.org/sqlite"
)

type SpeedtestResult struct {
	Timestamp     string     `json:"timestamp"`
	Server        ServerInfo `json:"server"`
	BytesSent     int64      `json:"bytes_sent"`
	BytesReceived int64      `json:"bytes_received"`
	Ping          float64    `json:"ping"`
	Jitter        float64    `json:"jitter"`
	Upload        float64    `json:"upload"`
	Download      float64    `json:"download"`
}

type ServerInfo struct {
	Name string `json:"name"`
}

func initDB(path string) (*sql.DB, error) {
	// Connect to the DB
	log.Printf("Connecting to SQLite database: %v", path)
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}

	// Ensure the DB is accessible
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("db unreachable: %w", err)
	}

	// Create the results table
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS results (
		timestamp TEXT PRIMARY KEY,
		server_name TEXT,
		bytes_sent INTEGER,
		bytes_received INTEGER,
		ping REAL,
		jitter REAL,
		upload REAL,
		download REAL
	);`
	if _, err := db.Exec(createTableSQL); err != nil {
		return nil, fmt.Errorf("failed to create table: %w", err)
	}

	return db, nil
}

func saveResult(db *sql.DB, r SpeedtestResult) error {
	insertSQL := `
		INSERT OR IGNORE INTO results (timestamp, server_name, bytes_sent, bytes_received, ping, jitter, upload, download)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?);`

	_, err := db.Exec(insertSQL,
		r.Timestamp,
		r.Server.Name,
		r.BytesSent,
		r.BytesReceived,
		r.Ping,
		r.Jitter,
		r.Upload,
		r.Download,
	)

	return err
}

func getResultsAsJSON(db *sql.DB, t time.Duration) ([]byte, error) {
	query := `
    SELECT json_group_array(
        json_object(
            'timestamp', timestamp,
            'server', json_object('name', server_name),
            'bytes_sent', bytes_sent,
            'bytes_received', bytes_received,
            'ping', ping,
            'jitter', jitter,
            'upload', upload,
            'download', download
        )
    )
    FROM results
    WHERE julianday(timestamp) >= (julianday('now') - ?);
    `
	var jsonBytes []byte
	err := db.QueryRow(query, t.Hours()/24).Scan(&jsonBytes)

	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return jsonBytes, nil
}
