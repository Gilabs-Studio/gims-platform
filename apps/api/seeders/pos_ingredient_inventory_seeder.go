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

// SeedPosIngredientInventory seeds inventory batches for F&B ingredient products
func SeedPosIngredientInventory() error {
	log.Println("Seeding POS ingredient inventory batches...")

	db := database.DB

	// Use the first available warehouse
	var warehouse warehouseModels.Warehouse
	if err := db.Where("deleted_at IS NULL").First(&warehouse).Error; err != nil {
		log.Printf("Warning: No warehouse found for ingredient inventory seeding: %v", err)
		return nil
	}

	// Map ingredient product codes to their initial stock quantities (in base UOM)
	type ingredientStock struct {
		code     string
		qty      float64
		expDays  int // days until expiry date; 0 = no expiry
	}

	ingredientStocks := []ingredientStock{
		{code: "ING-MILK-001", qty: 20, expDays: 7},      // 20 L, expires in 7 days (perishable)
		{code: "ING-TOMATO-001", qty: 150, expDays: 5},   // 150 pcs, expires in 5 days (perishable)
		{code: "ING-GARLIC-001", qty: 3000, expDays: 60}, // 3000 g
		{code: "ING-EGG-001", qty: 120, expDays: 14},     // 120 pcs
		{code: "ING-FLOUR-001", qty: 5000, expDays: 180}, // 5000 g
		{code: "ING-SUGAR-001", qty: 3000, expDays: 365}, // 3000 g
		{code: "ING-SALT-001", qty: 1500, expDays: 730},  // 1500 g, long shelf life
		{code: "ING-BUTTER-001", qty: 800, expDays: 30},  // 800 g
		{code: "ING-RICE-001", qty: 8000, expDays: 365},  // 8000 g (8 kg)
		{code: "ING-OIL-001", qty: 10, expDays: 365},     // 10 L
	}

	for _, ing := range ingredientStocks {
		var product productModels.Product
		if err := db.Where("code = ? AND deleted_at IS NULL", ing.code).First(&product).Error; err != nil {
			log.Printf("Warning: Ingredient product '%s' not found, skipping batch creation: %v", ing.code, err)
			continue
		}

		batchNumber := fmt.Sprintf("BCH-ING-%s-%s", ing.code, time.Now().Format("20060102"))

		// Check if batch already exists for this product in this warehouse
		var existing inventoryModels.InventoryBatch
		err := db.Where("batch_number = ? AND product_id = ? AND warehouse_id = ?",
			batchNumber, product.ID, warehouse.ID).First(&existing).Error

		if err == nil {
			// Already exists — skip
			continue
		}
		if err != gorm.ErrRecordNotFound {
			log.Printf("Warning: Error checking batch for '%s': %v", ing.code, err)
			continue
		}

		batch := inventoryModels.InventoryBatch{
			BatchNumber:      batchNumber,
			ProductID:        product.ID,
			WarehouseID:      warehouse.ID,
			InitialQuantity:  ing.qty,
			CurrentQuantity:  ing.qty,
			ReservedQuantity: 0,
			IsActive:         true,
		}

		if ing.expDays > 0 {
			expiry := time.Now().AddDate(0, 0, ing.expDays)
			batch.ExpiryDate = &expiry
		}

		if err := db.Create(&batch).Error; err != nil {
			log.Printf("Warning: Failed to create inventory batch for '%s': %v", ing.code, err)
		}
	}

	log.Println("POS ingredient inventory batches seeded successfully!")
	return nil
}
