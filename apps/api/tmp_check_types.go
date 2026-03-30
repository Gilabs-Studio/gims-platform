package main

import (
	"fmt"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal(err)
	}
	if err := database.Connect(); err != nil {
		log.Fatal(err)
	}

	var types []string
	database.DB.Model(&models.ChartOfAccount{}).Distinct("type").Pluck("type", &types)
	fmt.Printf("Unique COA Types: %v\n", types)
}
