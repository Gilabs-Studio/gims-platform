package main

import (
	"log"

	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/config"
	"github.com/gilabs/crm-healthcare/api/internal/core/infrastructure/database"
	"github.com/gilabs/crm-healthcare/api/internal/core/logger"
)

func main() {
	logger.Init()

	if err := config.Load(); err != nil {
		log.Fatal("Failed to load config:", err)
	}

	if err := database.Connect(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	if err := database.AutoMigrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	log.Println("Migrations completed")
}
