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

	var coaCount int64
	database.DB.Model(&models.ChartOfAccount{}).Count(&coaCount)
	fmt.Printf("DATABASE_CHECK: COA_COUNT=%d\n", coaCount)

	var settingsCount int64
	database.DB.Model(&models.FinanceSetting{}).Count(&settingsCount)
	fmt.Printf("DATABASE_CHECK: SETTINGS_COUNT=%d\n", settingsCount)
}
