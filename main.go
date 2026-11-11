package main

import "fmt"

func main() {
	result, err := runSpeedtest()
	if err != nil {
		fmt.Println(err.Error())
	}

	fmt.Println(result)
}
