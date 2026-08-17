package main

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/seeders"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatal(err)
	}

	apptime.Init(config.AppConfig.Server.Timezone)

	if err := database.Connect(); err != nil {
		log.Fatal(err)
	}
	defer database.Close()

	if err := database.AutoMigrate(); err != nil {
		log.Fatal("Failed to run database auto-migrate:", err)
	}

	if err := seeders.SeedAll(); err != nil {
		log.Fatal(err)
	}

	log.Println("Seeding complete.")
}
