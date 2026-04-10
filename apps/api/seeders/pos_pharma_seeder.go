package seeders

import (
	"fmt"
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	inventoryModels "github.com/gilabs/gims/api/internal/inventory/data/models"
	organizationModels "github.com/gilabs/gims/api/internal/organization/data/models"
	productModels "github.com/gilabs/gims/api/internal/product/data/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Pharmacy POS product UUIDs — hex-only characters [0-9a-f]
const (
	PosPharmaCategoryID = "c1000001-0000-0000-0000-000000000002"

	PosAmoxicillinID = "c2000001-0000-0000-0000-000000000010"
	PosAzithroID     = "c2000001-0000-0000-0000-000000000011"
	PosParacetamolID = "c2000001-0000-0000-0000-000000000012"
	PosIbuprofenID   = "c2000001-0000-0000-0000-000000000013"
	PosVitaminCID    = "c2000001-0000-0000-0000-000000000014"
	PosBpMonitorID   = "c2000001-0000-0000-0000-000000000015"
)

// SeedPosPharmaProducts seeds pharmacy STOCK products for Kimia Farma POS outlets.
func SeedPosPharmaProducts() error {
	log.Println("Seeding POS pharmacy products...")

	db := database.DB

	pharmaCategory := productModels.ProductCategory{
		ID:           PosPharmaCategoryID,
		Name:         "Obat & Suplemen",
		Description:  "Medicines and health supplements sold at pharmacy POS",
		CategoryType: productModels.CategoryTypeGoods,
		IsActive:     true,
	}
	if err := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "description", "category_type", "is_active", "updated_at"}),
	}).Create(&pharmaCategory).Error; err != nil {
		return err
	}

	strPtr := func(s string) *string { return &s }

	products := []productModels.Product{
		{
			ID:                 PosAmoxicillinID,
			Code:               "PHM-AMOX-500",
			Name:               "Amoxicillin 500mg Capsule",
			Description:        "Antibiotic for bacterial infections",
			CategoryID:         strPtr(pharmaCategory.ID),
			CostPrice:          15000,
			SellingPrice:       25000,
			ProductKind:        productModels.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     true,
			IsIngredient:       false,
			IsActive:           true,
			Status:             productModels.ProductStatusApproved,
			IsApproved:         true,
			TaxType:            "PPN",
		},
		{
			ID:                 PosAzithroID,
			Code:               "PHM-AZIT-500",
			Name:               "Azithromycin 500mg Tablet",
			Description:        "Macrolide antibiotic",
			CategoryID:         strPtr(pharmaCategory.ID),
			CostPrice:          35000,
			SellingPrice:       55000,
			ProductKind:        productModels.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     true,
			IsIngredient:       false,
			IsActive:           true,
			Status:             productModels.ProductStatusApproved,
			IsApproved:         true,
			TaxType:            "PPN",
		},
		{
			ID:                 PosParacetamolID,
			Code:               "PHM-PARA-500",
			Name:               "Paracetamol 500mg Tablet",
			Description:        "Analgesic and antipyretic",
			CategoryID:         strPtr(pharmaCategory.ID),
			CostPrice:          3000,
			SellingPrice:       6000,
			ProductKind:        productModels.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     true,
			IsIngredient:       false,
			IsActive:           true,
			Status:             productModels.ProductStatusApproved,
			IsApproved:         true,
			TaxType:            "PPN",
		},
		{
			ID:                 PosIbuprofenID,
			Code:               "PHM-IBUP-400",
			Name:               "Ibuprofen 400mg Tablet",
			Description:        "Anti-inflammatory and pain reliever",
			CategoryID:         strPtr(pharmaCategory.ID),
			CostPrice:          5000,
			SellingPrice:       10000,
			ProductKind:        productModels.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     true,
			IsIngredient:       false,
			IsActive:           true,
			Status:             productModels.ProductStatusApproved,
			IsApproved:         true,
			TaxType:            "PPN",
		},
		{
			ID:                 PosVitaminCID,
			Code:               "PHM-VITC-1000",
			Name:               "Vitamin C 1000mg Effervescent",
			Description:        "Immune support supplement",
			CategoryID:         strPtr(pharmaCategory.ID),
			CostPrice:          25000,
			SellingPrice:       45000,
			ProductKind:        productModels.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     true,
			IsIngredient:       false,
			IsActive:           true,
			Status:             productModels.ProductStatusApproved,
			IsApproved:         true,
			TaxType:            "PPN",
		},
		{
			ID:                 PosBpMonitorID,
			Code:               "MED-BPMON-001",
			Name:               "Blood Pressure Monitor Digital",
			Description:        "Automatic blood pressure monitoring device",
			CategoryID:         strPtr(pharmaCategory.ID),
			CostPrice:          250000,
			SellingPrice:       450000,
			ProductKind:        productModels.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     true,
			IsIngredient:       false,
			IsActive:           true,
			Status:             productModels.ProductStatusApproved,
			IsApproved:         true,
			TaxType:            "PPN",
		},
	}

	for i := range products {
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"code", "name", "description", "category_id",
				"cost_price", "selling_price", "product_kind", "is_inventory_tracked",
				"is_pos_available", "is_ingredient", "is_active", "status", "is_approved", "tax_type", "updated_at",
			}),
		}).Create(&products[i]).Error; err != nil {
			return err
		}
	}

	// Seed starter stock for Kimia Farma outlets exclusively so pharmacy
	// products don't bleed into Mie Gacoan warehouses.
	var outlets []organizationModels.Outlet
	if err := db.Where(
		"deleted_at IS NULL AND is_active = ? AND warehouse_id IS NOT NULL AND id IN ?",
		true,
		[]string{KimiaFarmaOutlet1ID, KimiaFarmaOutlet2ID},
	).Find(&outlets).Error; err != nil {
		return err
	}

	warehouseSet := make(map[string]struct{})
	var warehouseIDs []string
	for _, o := range outlets {
		if o.WarehouseID == nil || *o.WarehouseID == "" {
			continue
		}
		if _, exists := warehouseSet[*o.WarehouseID]; exists {
			continue
		}
		warehouseSet[*o.WarehouseID] = struct{}{}
		warehouseIDs = append(warehouseIDs, *o.WarehouseID)
	}

	if len(warehouseIDs) == 0 {
		log.Println("Warning: no Kimia Farma outlet warehouses found for pharmacy stock seeding")
		return nil
	}

	starterStock := map[string]float64{
		PosAmoxicillinID: 200,
		PosAzithroID:     100,
		PosParacetamolID: 500,
		PosIbuprofenID:   300,
		PosVitaminCID:    150,
		PosBpMonitorID:   20,
	}

	for _, warehouseID := range warehouseIDs {
		for productID, qty := range starterStock {
			batchNo := fmt.Sprintf("BCH-PHM-%s-%s", productID[len(productID)-6:], time.Now().Format("20060102"))
			var existing inventoryModels.InventoryBatch
			err := db.Where(
				"batch_number = ? AND product_id = ? AND warehouse_id = ?",
				batchNo, productID, warehouseID,
			).First(&existing).Error
			if err == nil {
				continue
			}
			if err != gorm.ErrRecordNotFound {
				continue
			}
			batch := inventoryModels.InventoryBatch{
				BatchNumber:      batchNo,
				ProductID:        productID,
				WarehouseID:      warehouseID,
				InitialQuantity:  qty,
				CurrentQuantity:  qty,
				ReservedQuantity: 0,
				IsActive:         true,
			}
			if createErr := db.Create(&batch).Error; createErr != nil {
				log.Printf("Warning: failed creating pharma batch product=%s warehouse=%s: %v", productID, warehouseID, createErr)
			}
		}
	}

	log.Println("POS pharmacy products seeded successfully")

	// Enable POS availability for existing products from product_seeder.go that have
	// stock in warehouses but were seeded without IsPosAvailable = true.
	posAvailableCodes := []string{
		"OVE-20240101-001", // Cetirizine 10mg
		"OVE-20240101-002", // Ibuprofen 400mg
		"OVE-20240101-003", // Paracetamol 500mg
		"PRE-20240101-001", // Amoxicillin 500mg
		"PRE-20240101-002", // Azithromycin 500mg
		"PRE-20240101-003", // Omeprazole 20mg
		"MED-20240101-001", // Blood Pressure Monitor
	}
	if err := database.DB.Model(&productModels.Product{}).
		Where("code IN ?", posAvailableCodes).
		Update("is_pos_available", true).Error; err != nil {
		log.Printf("Warning: Failed to enable POS availability for existing products: %v", err)
	} else {
		log.Println("Enabled IsPosAvailable for legacy product_seeder products")
	}

	return nil
}
