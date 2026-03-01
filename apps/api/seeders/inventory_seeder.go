package seeders

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
)

// SeedInventory seeds sample inventory batches
func SeedInventory() error {
	db := database.DB

	log.Println("Seeding inventory batches...")

	// Get Warehouses and Products
	var warehouses []warehouseModels.Warehouse
	if err := db.Find(&warehouses).Error; err != nil {
		return err
	}

	var products []productModels.Product
	if err := db.Find(&products).Error; err != nil {
		return err
	}

	if len(warehouses) == 0 || len(products) == 0 {
		return fmt.Errorf("warehouses or products not found, cannot seed inventory")
	}

	// Define scenarios
	// Scenario 1: OK Stock (Available > Min, < Max)
	// Scenario 2: Low Stock (Available <= Min)
	// Scenario 3: Out of Stock (Available = 0) - No batches or 0 quantity batches
	// Scenario 4: Overstock (Available > Max)

	// Since we iterate through products, let's assign scenarios based on index
	// We will seed into the first 2 warehouses mostly.

	batches := []inventoryModels.InventoryBatch{}

	for i, product := range products {
		// Distribute across warehouses
		// Warehouse 1
		wh1 := warehouses[0]
		
		scenario := i % 4

		// Base batch creation helper
		createBatch := func(whID string, qty float64, expiryDays int) inventoryModels.InventoryBatch {
			expDate := time.Now().AddDate(0, 0, expiryDays)
			return inventoryModels.InventoryBatch{
				BatchNumber:      fmt.Sprintf("BATCH-%s-%d", product.Code, rand.Intn(10000)),
				ProductID:        product.ID,
				WarehouseID:      whID,
				InitialQuantity:  qty,
				CurrentQuantity:  qty,
				ReservedQuantity: 0,
				ExpiryDate:       &expDate,
			}
		}

		switch scenario {
		case 0: // OK Stock
			// E.g., Min 100, Max 500. Lets give 200.
			qty := product.MinStock + (product.MaxStock-product.MinStock)/2
			batches = append(batches, createBatch(wh1.ID, qty, 365))
			
		case 1: // Low Stock
			// E.g., Min 100. Give 50.
			qty := product.MinStock / 2
			if qty == 0 { qty = 1 }
			batches = append(batches, createBatch(wh1.ID, qty, 180))

		case 2: // Out of Stock
			// Add a batch with 0 quantity (empty batch)
			batches = append(batches, createBatch(wh1.ID, 0, 30))

		case 3: // Overstock
			// E.g., Max 500. Give 600.
			qty := product.MaxStock + 100
			batches = append(batches, createBatch(wh1.ID, qty, 700))
		}

		// Add some random variation to Warehouse 2 if exists
		if len(warehouses) > 1 {
			wh2 := warehouses[1]
			// 50% chance to have stock in WH2
			if rand.Float32() > 0.5 {
				batches = append(batches, createBatch(wh2.ID, product.MinStock + 10, 200))
			}
		}
	}

	for i := range batches {
		if err := db.Create(&batches[i]).Error; err != nil {
			log.Printf("Failed to create batch %s: %v", batches[i].BatchNumber, err)
		}
	}

	// --- Use-case demo batches: Expiring (30d) and Expired ---
	// These ensure the metrics dashboard always has visible data for the two edge-case states.
	// We attach them to the first product in the first warehouse.
	firstProduct := products[0]
	firstWarehouse := warehouses[0]

	// Expiring within 30 days: expires in 10 days, still has healthy quantity
	expiringAt := time.Now().AddDate(0, 0, 10)
	expiringBatch := inventoryModels.InventoryBatch{
		BatchNumber:      fmt.Sprintf("BCH-EXPIRING-%s", firstProduct.Code),
		ProductID:        firstProduct.ID,
		WarehouseID:      firstWarehouse.ID,
		InitialQuantity:  50,
		CurrentQuantity:  50,
		ReservedQuantity: 0,
		ExpiryDate:       &expiringAt,
		IsActive:         true,
	}

	// Expired: expired 60 days ago, still has remaining quantity (needs write-off)
	expiredAt := time.Now().AddDate(0, 0, -60)
	expiredBatch := inventoryModels.InventoryBatch{
		BatchNumber:      fmt.Sprintf("BCH-EXPIRED-%s", firstProduct.Code),
		ProductID:        firstProduct.ID,
		WarehouseID:      firstWarehouse.ID,
		InitialQuantity:  30,
		CurrentQuantity:  30,
		ReservedQuantity: 0,
		ExpiryDate:       &expiredAt,
		IsActive:         true,
	}

	for _, specialBatch := range []inventoryModels.InventoryBatch{expiringBatch, expiredBatch} {
		if err := db.Create(&specialBatch).Error; err != nil {
			log.Printf("Failed to create special batch %s: %v", specialBatch.BatchNumber, err)
		}
	}

	log.Println("Inventory batches seeded successfully!")
	return nil
}
