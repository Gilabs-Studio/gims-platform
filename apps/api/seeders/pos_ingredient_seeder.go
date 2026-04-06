package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/product/data/models"
	"gorm.io/gorm/clause"
)

// POS ingredient product UUIDs — all hex-only characters [0-9a-f]
const (
	// Category
	FnbIngredientCategoryID = "f0000001-0000-0000-0000-000000000001"

	// Ingredient products
	IngredientMilkID         = "f1000001-0000-0000-0000-000000000001"
	IngredientTomatoID       = "f1000001-0000-0000-0000-000000000002"
	IngredientGarlicID       = "f1000001-0000-0000-0000-000000000003"
	IngredientEggID          = "f1000001-0000-0000-0000-000000000004"
	IngredientWheatFlourID   = "f1000001-0000-0000-0000-000000000005"
	IngredientSugarID        = "f1000001-0000-0000-0000-000000000006"
	IngredientSaltID         = "f1000001-0000-0000-0000-000000000007"
	IngredientButterID       = "f1000001-0000-0000-0000-000000000008"
	IngredientCookedRiceID   = "f1000001-0000-0000-0000-000000000009"
	IngredientCookingOilID   = "f1000001-0000-0000-0000-00000000000a"
)

// SeedPosIngredients seeds raw material products used as F&B recipe ingredients
func SeedPosIngredients() error {
	log.Println("Seeding POS F&B ingredient products...")

	db := database.DB

	// 1. Ensure "Bahan Baku F&B" category exists
	cat := models.ProductCategory{
		Name:         "Bahan Baku F&B",
		Description:  "Raw materials and ingredients used in F&B product recipes",
		CategoryType: models.CategoryTypeFnB,
		IsActive:     true,
	}
	// Use a fixed string ID to allow idempotent upsert
	if err := db.Where("name = ?", cat.Name).FirstOrCreate(&cat).Error; err != nil {
		log.Printf("Warning: Failed to ensure F&B ingredient category: %v", err)
		return err
	}
	// Override the auto-generated ID with our fixed UUID so inventory seeder can reference it
	if cat.ID != FnbIngredientCategoryID {
		db.Model(&cat).Update("id", FnbIngredientCategoryID)
	}

	// 2. Ensure UOMs exist (Liter, Kg, Gram, Pcs)
	uoms := map[string]models.UnitOfMeasure{
		"Liter": {Name: "Liter", Symbol: "L", Description: "Volume — liquids", IsActive: true},
		"Kg":    {Name: "Kilogram", Symbol: "Kg", Description: "Weight — bulk dry goods", IsActive: true},
		"Gram":  {Name: "Gram", Symbol: "g", Description: "Weight — small portions", IsActive: true},
		"Pcs":   {Name: "Piece", Symbol: "Pcs", Description: "Individual pieces", IsActive: true},
	}
	uomIDs := map[string]string{}
	for key, u := range uoms {
		tmp := u
		if err := db.Where("name = ?", tmp.Name).FirstOrCreate(&tmp).Error; err != nil {
			log.Printf("Warning: Failed to ensure UOM %s: %v", tmp.Name, err)
			continue
		}
		uomIDs[key] = tmp.ID
	}

	// Helper to get *string
	strPtr := func(s string) *string { return &s }

	// 3. Seed ingredient products
	ingredients := []models.Product{
		{
			ID:            IngredientMilkID,
			Code:          "ING-MILK-001",
			Name:          "Susu Segar",
			Description:   "Fresh whole milk for beverages and food",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Liter"]),
			PurchaseUomID: strPtr(uomIDs["Liter"]),
			PurchaseUomConversion: 1,
			CostPrice:     15000,
			SellingPrice:  0,
			MinStock:      5,
			MaxStock:      50,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientTomatoID,
			Code:          "ING-TOMATO-001",
			Name:          "Tomat",
			Description:   "Fresh tomatoes for sauces and garnishes",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Pcs"]),
			PurchaseUomID: strPtr(uomIDs["Kg"]),
			PurchaseUomConversion: 5,
			CostPrice:     3000,
			SellingPrice:  0,
			MinStock:      20,
			MaxStock:      200,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientGarlicID,
			Code:          "ING-GARLIC-001",
			Name:          "Bawang Putih",
			Description:   "Fresh garlic cloves",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Gram"]),
			PurchaseUomID: strPtr(uomIDs["Kg"]),
			PurchaseUomConversion: 1000,
			CostPrice:     25,
			SellingPrice:  0,
			MinStock:      500,
			MaxStock:      5000,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientEggID,
			Code:          "ING-EGG-001",
			Name:          "Telur Ayam",
			Description:   "Farm fresh chicken eggs",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Pcs"]),
			PurchaseUomID: strPtr(uomIDs["Pcs"]),
			PurchaseUomConversion: 1,
			CostPrice:     2500,
			SellingPrice:  0,
			MinStock:      30,
			MaxStock:      300,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientWheatFlourID,
			Code:          "ING-FLOUR-001",
			Name:          "Tepung Terigu",
			Description:   "All-purpose wheat flour",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Gram"]),
			PurchaseUomID: strPtr(uomIDs["Kg"]),
			PurchaseUomConversion: 1000,
			CostPrice:     12,
			SellingPrice:  0,
			MinStock:      1000,
			MaxStock:      10000,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientSugarID,
			Code:          "ING-SUGAR-001",
			Name:          "Gula Pasir",
			Description:   "Refined white granulated sugar",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Gram"]),
			PurchaseUomID: strPtr(uomIDs["Kg"]),
			PurchaseUomConversion: 1000,
			CostPrice:     15,
			SellingPrice:  0,
			MinStock:      500,
			MaxStock:      5000,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientSaltID,
			Code:          "ING-SALT-001",
			Name:          "Garam Dapur",
			Description:   "iodized table salt",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Gram"]),
			PurchaseUomID: strPtr(uomIDs["Kg"]),
			PurchaseUomConversion: 1000,
			CostPrice:     5,
			SellingPrice:  0,
			MinStock:      200,
			MaxStock:      2000,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientButterID,
			Code:          "ING-BUTTER-001",
			Name:          "Mentega",
			Description:   "Unsalted butter for cooking and baking",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Gram"]),
			PurchaseUomID: strPtr(uomIDs["Gram"]),
			PurchaseUomConversion: 1,
			CostPrice:     50,
			SellingPrice:  0,
			MinStock:      200,
			MaxStock:      2000,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientCookedRiceID,
			Code:          "ING-RICE-001",
			Name:          "Nasi Putih",
			Description:   "Cooked white rice (measured in grams per serving)",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Gram"]),
			PurchaseUomID: strPtr(uomIDs["Kg"]),
			PurchaseUomConversion: 1000,
			CostPrice:     5,
			SellingPrice:  0,
			MinStock:      500,
			MaxStock:      10000,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
		{
			ID:            IngredientCookingOilID,
			Code:          "ING-OIL-001",
			Name:          "Minyak Goreng",
			Description:   "Refined cooking oil",
			CategoryID:    strPtr(cat.ID),
			UomID:         strPtr(uomIDs["Liter"]),
			PurchaseUomID: strPtr(uomIDs["Liter"]),
			PurchaseUomConversion: 1,
			CostPrice:     20000,
			SellingPrice:  0,
			MinStock:      2,
			MaxStock:      30,
			TaxType:       "PPN",
			IsTaxInclusive: true,
			IsIngredient:       true,
			ProductKind:        models.ProductKindStock,
			IsInventoryTracked: true,
			IsPosAvailable:     false,
			IsActive:           true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
		},
	}

	// Upsert: conflict on `code`, update key fields including new POS fields
	for _, p := range ingredients {
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name", "description", "category_id", "uom_id", "purchase_uom_id",
				"purchase_uom_conversion", "cost_price", "min_stock", "max_stock",
				"is_ingredient", "is_active", "status", "is_approved",
				"product_kind", "is_inventory_tracked", "is_pos_available", "updated_at",
			}),
		}).Create(&p).Error; err != nil {
			log.Printf("Warning: Failed to seed ingredient product %s: %v", p.Code, err)
		}
	}

	log.Println("POS F&B ingredient products seeded successfully!")
	return nil
}
