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

const (
	PosGoodsCategoryID = "c1000001-0000-0000-0000-000000000001"
	PosGoodsWaterID    = "c2000001-0000-0000-0000-000000000001"
	PosGoodsSnackID    = "c2000001-0000-0000-0000-000000000002"
	PosGoodsTissueID   = "c2000001-0000-0000-0000-000000000003"
)

// SeedPosGoodsProducts seeds simple STOCK products for Goods-mode selling in POS.
func SeedPosGoodsProducts() error {
	log.Println("Seeding POS goods products...")

	db := database.DB

	goodsCategory := productModels.ProductCategory{
		ID:           PosGoodsCategoryID,
		Name:         "POS Goods",
		Description:  "Ready-to-sell retail goods for POS terminal",
		CategoryType: productModels.CategoryTypeGoods,
		IsActive:     true,
	}
	if err := db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "description", "category_type", "is_active", "updated_at"}),
	}).Create(&goodsCategory).Error; err != nil {
		return err
	}

	strPtr := func(s string) *string { return &s }

	products := []productModels.Product{
		{
			ID:                 PosGoodsWaterID,
			Code:               "GDS-WATER-001",
			Name:               "Air Mineral 600ml",
			Description:        "Bottled mineral water",
			ImageURL:           strPtr("/uploads/pos/goods/mineral-water.webp"),
			CategoryID:         strPtr(goodsCategory.ID),
			CostPrice:          2500,
			SellingPrice:       5000,
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
			ID:                 PosGoodsSnackID,
			Code:               "GDS-SNACK-001",
			Name:               "Keripik Kentang",
			Description:        "Potato chips ready to sell",
			ImageURL:           strPtr("/uploads/pos/goods/potato-chips.webp"),
			CategoryID:         strPtr(goodsCategory.ID),
			CostPrice:          7000,
			SellingPrice:       12000,
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
			ID:                 PosGoodsTissueID,
			Code:               "GDS-TISSUE-001",
			Name:               "Tisu Travel Pack",
			Description:        "Pocket tissue for checkout counter",
			ImageURL:           strPtr("/uploads/pos/goods/tissue-pack.webp"),
			CategoryID:         strPtr(goodsCategory.ID),
			CostPrice:          4000,
			SellingPrice:       7000,
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
				"code", "name", "description", "image_url", "category_id",
				"cost_price", "selling_price", "product_kind", "is_inventory_tracked",
				"is_pos_available", "is_ingredient", "is_active", "status", "is_approved", "tax_type", "updated_at",
			}),
		}).Create(&products[i]).Error; err != nil {
			return err
		}
	}

	// Ensure each active outlet warehouse has starter stock for goods products.
	var outlets []organizationModels.Outlet
	if err := db.Where("deleted_at IS NULL AND is_active = ? AND warehouse_id IS NOT NULL", true).Find(&outlets).Error; err != nil {
		return err
	}

	warehouseMap := make(map[string]struct{})
	warehouseIDs := make([]string, 0, len(outlets))
	for _, outlet := range outlets {
		if outlet.WarehouseID == nil || *outlet.WarehouseID == "" {
			continue
		}
		if _, exists := warehouseMap[*outlet.WarehouseID]; exists {
			continue
		}
		warehouseMap[*outlet.WarehouseID] = struct{}{}
		warehouseIDs = append(warehouseIDs, *outlet.WarehouseID)
	}

	if len(warehouseIDs) == 0 {
		log.Println("Warning: no active outlet warehouses found for POS goods stock seeding")
		return nil
	}

	starterStock := map[string]float64{
		PosGoodsWaterID:  120,
		PosGoodsSnackID:  80,
		PosGoodsTissueID: 60,
	}

	for _, warehouseID := range warehouseIDs {
		for productID, qty := range starterStock {
			batchNo := fmt.Sprintf("BCH-GDS-%s-%s", productID[len(productID)-6:], time.Now().Format("20060102"))
			var existing inventoryModels.InventoryBatch
			err := db.Where("batch_number = ? AND product_id = ? AND warehouse_id = ?", batchNo, productID, warehouseID).
				First(&existing).Error
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
				log.Printf("Warning: failed creating goods inventory batch for product=%s warehouse=%s: %v", productID, warehouseID, createErr)
			}
		}
	}

	log.Println("POS goods products seeded successfully")
	return nil
}
