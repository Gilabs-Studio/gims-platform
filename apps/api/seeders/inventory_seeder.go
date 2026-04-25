package seeders

import (
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	warehouseModels "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"gorm.io/gorm"
)

// SeedInventory seeds sample inventory batches
func SeedInventory() error {
	db := database.DB

	if isMinimalSeedMode() {
		log.Println("Seeding minimal inventory batch for SEED_MINIMAL_DATA")
		var warehouse warehouseModels.Warehouse
		if err := db.First(&warehouse).Error; err != nil {
			return err
		}
		var product productModels.Product
		if err := db.First(&product).Error; err != nil {
			return err
		}

		batch := inventoryModels.InventoryBatch{
			BatchNumber:      "BATCH-MIN-001",
			ProductID:        product.ID,
			WarehouseID:      warehouse.ID,
			InitialQuantity:  100,
			CurrentQuantity:  100,
			ReservedQuantity: 0,
			CostPrice:        product.CostPrice,
		}

		var existing inventoryModels.InventoryBatch
		if err := db.Where("batch_number = ?", batch.BatchNumber).First(&existing).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				if err := db.Create(&batch).Error; err != nil {
					return err
				}
				return nil
			}
			return err
		}

		if err := db.Model(&existing).Updates(map[string]interface{}{
			"product_id":        batch.ProductID,
			"warehouse_id":      batch.WarehouseID,
			"initial_quantity":  batch.InitialQuantity,
			"current_quantity":  batch.CurrentQuantity,
			"reserved_quantity": batch.ReservedQuantity,
			"cost_price":        batch.CostPrice,
			"is_active":         true,
			"updated_at":        time.Now(),
		}).Error; err != nil {
			return err
		}
		return nil
	}

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

	upsertBatch := func(batch inventoryModels.InventoryBatch) {
		var existing inventoryModels.InventoryBatch
		err := db.Where("batch_number = ? AND product_id = ? AND warehouse_id = ?", batch.BatchNumber, batch.ProductID, batch.WarehouseID).
			First(&existing).Error
		if err == nil {
			if updateErr := db.Model(&existing).Updates(map[string]interface{}{
				"initial_quantity":  batch.InitialQuantity,
				"current_quantity":  batch.CurrentQuantity,
				"reserved_quantity": batch.ReservedQuantity,
				"cost_price":        batch.CostPrice,
				"expiry_date":       batch.ExpiryDate,
				"is_active":         true,
				"updated_at":        time.Now(),
			}).Error; updateErr != nil {
				log.Printf("Failed to update batch %s: %v", batch.BatchNumber, updateErr)
			}
			return
		}
		if err != gorm.ErrRecordNotFound {
			log.Printf("Failed to query batch %s: %v", batch.BatchNumber, err)
			return
		}
		if createErr := db.Create(&batch).Error; createErr != nil {
			log.Printf("Failed to create batch %s: %v", batch.BatchNumber, createErr)
		}
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
		createBatch := func(whID string, scenarioTag string, qty float64, expiryDays int) inventoryModels.InventoryBatch {
			expDate := time.Now().AddDate(0, 0, expiryDays)
			costPrice := product.CostPrice
			if costPrice <= 0 {
				costPrice = product.CurrentHpp
			}
			if costPrice <= 0 {
				costPrice = 1
			}
			batchNumber := fmt.Sprintf("BATCH-%s-%s-%s", product.Code, whID[len(whID)-6:], scenarioTag)
			return inventoryModels.InventoryBatch{
				BatchNumber:      batchNumber,
				ProductID:        product.ID,
				WarehouseID:      whID,
				InitialQuantity:  qty,
				CurrentQuantity:  qty,
				ReservedQuantity: 0,
				CostPrice:        costPrice,
				ExpiryDate:       &expDate,
			}
		}

		switch scenario {
		case 0: // OK Stock
			// E.g., Min 100, Max 500. Lets give 200.
			qty := product.MinStock + (product.MaxStock-product.MinStock)/2
			batches = append(batches, createBatch(wh1.ID, "S0", qty, 365))

		case 1: // Low Stock
			// E.g., Min 100. Give 50.
			qty := product.MinStock / 2
			if qty == 0 {
				qty = 1
			}
			batches = append(batches, createBatch(wh1.ID, "S1", qty, 180))

		case 2: // Out of Stock
			// Add a batch with 0 quantity (empty batch)
			batches = append(batches, createBatch(wh1.ID, "S2", 0, 30))

		case 3: // Overstock
			// E.g., Max 500. Give 600.
			qty := product.MaxStock + 100
			batches = append(batches, createBatch(wh1.ID, "S3", qty, 700))
		}

		// Add some random variation to Warehouse 2 if exists
		if len(warehouses) > 1 {
			wh2 := warehouses[1]
			batches = append(batches, createBatch(wh2.ID, "WH2", product.MinStock+10, 200))
		}
	}

	for i := range batches {
		upsertBatch(batches[i])
	}

	// --- Use-case demo batches: Expiring (30d) and Expired ---
	// These ensure the metrics dashboard always has visible data for the two edge-case states.
	// We attach them to the first product in the first warehouse.
	firstProduct := products[0]
	firstWarehouse := warehouses[0]
	specialBatchCost := firstProduct.CostPrice
	if specialBatchCost <= 0 {
		specialBatchCost = firstProduct.CurrentHpp
	}
	if specialBatchCost <= 0 {
		specialBatchCost = 1
	}

	// Expiring within 30 days: expires in 10 days, still has healthy quantity
	expiringAt := time.Now().AddDate(0, 0, 10)
	expiringBatch := inventoryModels.InventoryBatch{
		BatchNumber:      fmt.Sprintf("BCH-EXPIRING-%s", firstProduct.Code),
		ProductID:        firstProduct.ID,
		WarehouseID:      firstWarehouse.ID,
		InitialQuantity:  50,
		CurrentQuantity:  50,
		ReservedQuantity: 0,
		CostPrice:        specialBatchCost,
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
		CostPrice:        specialBatchCost,
		ExpiryDate:       &expiredAt,
		IsActive:         true,
	}

	for _, specialBatch := range []inventoryModels.InventoryBatch{expiringBatch, expiredBatch} {
		upsertBatch(specialBatch)
	}

	log.Println("Inventory batches seeded successfully!")
	return nil
}
