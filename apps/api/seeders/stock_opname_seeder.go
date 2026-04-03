package seeders

import (
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
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

	// Find product IDs available in this warehouse via inventory batches
	var batches []inventoryModels.InventoryBatch
	if err := db.Where("warehouse_id = ?", warehouse.ID).Find(&batches).Error; err != nil {
		log.Printf("Warning: Failed to fetch inventory batches for warehouse %s: %v", warehouse.ID, err)
	}

	uniqueProducts := make([]string, 0)
	seen := map[string]bool{}
	for _, b := range batches {
		if b.ProductID == "" {
			continue
		}
		if !seen[b.ProductID] {
			seen[b.ProductID] = true
			uniqueProducts = append(uniqueProducts, b.ProductID)
		}
	}

	if len(uniqueProducts) == 0 {
		log.Println("No inventory products found for stock opname seeder; skipping item creation")
		return nil
	}

	// For each opname, create a few items based on available products
	for idx := range opnames {
		opname := &opnames[idx]

		items := make([]models.StockOpnameItem, 0)
		totalVariance := 0.0

		// limit to max 6 items per opname for seeding
		itemCount := 6
		for j := 0; j < itemCount; j++ {
			prodID := uniqueProducts[(idx*itemCount+j)%len(uniqueProducts)]

			// compute system qty by summing available across batches for this product in the warehouse
			var systemQty float64
			db.Model(&inventoryModels.InventoryBatch{}).
				Select("COALESCE(SUM(current_quantity - reserved_quantity),0)").
				Where("warehouse_id = ? AND product_id = ?", warehouse.ID, prodID).
				Scan(&systemQty)

			// fetch product for display/reference check (optional)
			var prod productModels.Product
			if err := db.Where("id = ?", prodID).First(&prod).Error; err != nil {
				// skip if product not found
				continue
			}

			// create a small deterministic physical difference for some items
			var physical float64 = systemQty
			if j%3 == 0 {
				// short by 2 units (but not below zero)
				if physical >= 2 {
					physical = physical - 2
				} else {
					physical = 0
				}
			} else if j%5 == 0 {
				// over by 1 unit
				physical = physical + 1
			}

			variance := physical - systemQty

			item := models.StockOpnameItem{
				StockOpnameID: opname.ID,
				ProductID:     prodID,
				SystemQty:     systemQty,
				PhysicalQty:   &physical,
				VarianceQty:   variance,
				Notes:         fmt.Sprintf("Seeded item for product %s", prod.Code),
			}

			totalVariance += variance
			items = append(items, item)
		}

		if len(items) > 0 {
			if err := db.Create(&items).Error; err != nil {
				log.Printf("Warning: Failed to create stock opname items for opname %s: %v", opname.OpnameNumber, err)
				continue
			}
			// update opname totals
			opname.TotalItems = len(items)
			opname.TotalVarianceQty = totalVariance
			if err := db.Save(opname).Error; err != nil {
				log.Printf("Warning: Failed to update opname totals for %s: %v", opname.OpnameNumber, err)
			}
		}
	}

	return nil
}
