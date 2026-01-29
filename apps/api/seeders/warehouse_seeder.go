package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	geographic "github.com/gilabs/gims/api/internal/geographic/data/models"
	"github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm/clause"
)

// SeedWarehouse seeds sample warehouse master data with relational data
func SeedWarehouse() error {
	db := database.DB

	log.Println("Seeding warehouses...")

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

	warehouses := []models.Warehouse{
		{
			Code:        "WH-001",
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
			Code:        "WH-002",
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

	for i := range warehouses {
		// Handle code conflicts
		var existing models.Warehouse
		err := db.Unscoped().Where("code = ?", warehouses[i].Code).First(&existing).Error
		if err == nil && existing.ID != warehouses[i].ID {
			log.Printf("Warehouse code conflict for %s: Moving existing...", warehouses[i].Code)
			db.Unscoped().Model(&existing).Update("code", warehouses[i].Code+"_old_"+existing.ID[:8])
		}

		if err := db.Clauses(clause.OnConflict{UpdateAll: true}).Create(&warehouses[i]).Error; err != nil {
			return err
		}
	}

	log.Println("Warehouse data seeded successfully!")
	return nil
}
