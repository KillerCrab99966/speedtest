package main

import (
	"encoding/json"
	"fmt"
	"os/exec"
)

func runSpeedtest() ([]SpeedtestResult, error) {
	// Run the test
	cmd := exec.Command("speedtest-cli", "--json")

	out, err := cmd.Output()
	if err != nil {
		return []SpeedtestResult{}, fmt.Errorf("failed to execute command: %w", err)
	}

	// Parse JSON
	var results []SpeedtestResult
	if err := json.Unmarshal(out, &results); err != nil {
		return []SpeedtestResult{}, fmt.Errorf("failed to parse JSON: %w", err)
	}

	return results, nil
}
