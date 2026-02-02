package seeders

import (
	"fmt"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/stock_opname/data/models"
	wModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
)

// SeedStockOpname seeds stock opname data
func SeedStockOpname() error {
	db := database.DB

	// Check if data already exists
	var count int64
	db.Model(&models.StockOpname{}).Count(&count)
	if count > 0 {
		return nil
	}

	// Get a warehouse
	var warehouse wModels.Warehouse
	if err := db.First(&warehouse).Error; err != nil {
		fmt.Println("Skipping Stock Opname seeder: No warehouse found")
		return nil
	}

	fmt.Println("Seeding Stock Opnames...")

	opnames := []models.StockOpname{
		{
			OpnameNumber: fmt.Sprintf("OP-%s-0001", time.Now().Format("200601")),
			WarehouseID:  warehouse.ID,
			Date:         time.Now(),
			Status:       models.StockOpnameStatusDraft,
			Description:  "Initial stock opname draft",
			TotalItems:   0,
		},
		{
			OpnameNumber: fmt.Sprintf("OP-%s-0002", time.Now().Format("200601")),
			WarehouseID:  warehouse.ID,
			Date:         time.Now().AddDate(0, 0, -1),
			Status:       models.StockOpnameStatusPending,
			Description:  "Pending approval opname",
            TotalItems:   0,
		},
	}

	if err := db.Create(&opnames).Error; err != nil {
		return err
	}

	return nil
}
