package seeders

import (
	"log"
	"os"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	geographic "github.com/gilabs/gims/api/internal/geographic/data/models"
	"github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
)

// SeedWarehouse seeds sample warehouse master data with relational data
// This is idempotent - safe to run multiple times without creating duplicates
func SeedWarehouse() error {
	db := database.DB

	log.Println("Seeding warehouses...")

	// PRODUCTION SAFETY: Never run destructive operations in production
	env := os.Getenv("APP_ENV")
	if env == "production" {
		log.Println("WARNING: Skipping warehouse seeder in production environment")
		log.Println("Production warehouses should be managed through admin panel or migrations")
		return nil
	}

	// Get sample villages for location references
	var villages []geographic.Village
	db.Preload("District.City.Province").Limit(5).Find(&villages)

	var villageID1, villageID2*string
	if len(villages) > 0 {
		villageID1 = &villages[0].ID
	}
	if len(villages) > 1 {
		villageID2 = &villages[1].ID
	}

	// Coordinates for Jakarta warehouses
	lat1, lng1 := -6.2088, 106.8456   // Central Jakarta
	lat2, lng2 := -6.1751, 106.8650   // North Jakarta

	// Capacities
	cap1, cap2 := 10000, 15000

	// Seed warehouses - use unique codes that won't conflict with real data
	// Format: SEED-XXX to clearly mark as seed data
	warehouses := []models.Warehouse{
		{
			Code:        "SEED-WH-001",
			Name:        "Main Warehouse - Jakarta Pusat",
			Description: "Primary warehouse for central Jakarta operations",
			Capacity:    &cap1,
			Address:     "Jl. Jend. Sudirman Kav. 52-53, Senayan, Jakarta Pusat",
			VillageID:   villageID1,
			Latitude:    &lat1,
			Longitude:   &lng1,
			IsActive:    true,
		},
		{
			Code:        "SEED-WH-002",
			Name:        "North Jakarta Distribution Center",
			Description: "Distribution warehouse for north Jakarta region",
			Capacity:    &cap2,
			Address:     "Kawasan Industri Pulogadung, Jakarta Utara",
			VillageID:   villageID2,
			Latitude:    &lat2,
			Longitude:   &lng2,
			IsActive:    true,
		},
	}

	// Idempotent insert: Use FirstOrCreate to prevent duplicates
	// This is safe for multiple runs and production-ready
	for i := range warehouses {
		var existing models.Warehouse
		err := db.Where("code = ?", warehouses[i].Code).First(&existing).Error
		
		if err == gorm.ErrRecordNotFound {
			// Create new warehouse
			if err := db.Create(&warehouses[i]).Error; err != nil {
				log.Printf("Failed to create warehouse %s: %v", warehouses[i].Code, err)
				return err
			}
			log.Printf("Created warehouse: %s", warehouses[i].Code)
		} else if err != nil {
			log.Printf("Error checking warehouse %s: %v", warehouses[i].Code, err)
			return err
		} else {
			// Warehouse exists - update only if needed (optional in dev, skip in prod)
			if env == "development" || env == "local" {
				// Update existing warehouse data to match seed
				if err := db.Model(&existing).Updates(warehouses[i]).Error; err != nil {
					log.Printf("Failed to update warehouse %s: %v", warehouses[i].Code, err)
					return err
				}
				log.Printf("Updated warehouse: %s", warehouses[i].Code)
			} else {
				log.Printf("Warehouse %s already exists, skipping update", warehouses[i].Code)
			}
		}
	}

	log.Println("Warehouse data seeded successfully!")
	return nil
}
