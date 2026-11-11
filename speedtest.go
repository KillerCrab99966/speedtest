package main

import (
	"os/exec"
)

func runSpeedtest() (string, error) {
	cmd := exec.Command("speedtest-cli", "--json")

	out, err := cmd.Output()
	if err != nil {
		return "", err
	}

	return string(out), nil
}
