package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/product/data/models"
	"gorm.io/gorm/clause"
)

// POS recipe & service product UUIDs — hex-only characters [0-9a-f]
const (
	// Categories (F&B menu)
	FnbMainCourseCategoryID = "f0000002-0000-0000-0000-000000000001"
	FnbBeverageCategoryID   = "f0000002-0000-0000-0000-000000000002"
	FnbServiceCategoryID    = "f0000002-0000-0000-0000-000000000003"

	// Product Types (F&B)
	FnbFoodTypeID  = "b0000001-0000-0000-0000-000000000001"
	FnbDrinkTypeID = "b0000001-0000-0000-0000-000000000002"

	// Recipe products
	RecipeNasiGorengID = "e1000001-0000-0000-0000-000000000001"
	RecipeKopiSusuID   = "e1000001-0000-0000-0000-000000000002"
	RecipeEsTehManisID = "e1000001-0000-0000-0000-000000000003"

	// Service products
	ServiceDeliveryFeeID   = "e2000001-0000-0000-0000-000000000001"
	ServiceChargeID        = "e2000001-0000-0000-0000-000000000002"

	// Recipe items (BOM lines)
	RecItemNGRiceID   = "a1000001-0000-0000-0000-000000000001"
	RecItemNGEggID    = "a1000001-0000-0000-0000-000000000002"
	RecItemNGOilID    = "a1000001-0000-0000-0000-000000000003"
	RecItemNGGarlicID = "a1000001-0000-0000-0000-000000000004"
	RecItemKSCoffeeID = "a1000001-0000-0000-0000-000000000005"  // NOTE: no such ingredient yet, we use a placeholder
	RecItemKSMilkID   = "a1000001-0000-0000-0000-000000000006"
	RecItemKSSugarID  = "a1000001-0000-0000-0000-000000000007"
	RecItemETTeaID    = "a1000001-0000-0000-0000-000000000008"  // NOTE: no tea ingredient exists, skip or create
	RecItemETSugarID  = "a1000001-0000-0000-0000-000000000009"
)

// SeedPosRecipeProducts seeds F&B recipe menu items, service products, and recipe BOM items
func SeedPosRecipeProducts() error {
	log.Println("Seeding POS recipe & service products...")

	db := database.DB

	// === Categories for F&B menus ===
	menuCategories := []models.ProductCategory{
		{ID: FnbMainCourseCategoryID, Name: "Main Course", Description: "Main dish items", CategoryType: models.CategoryTypeFnB, IsActive: true},
		{ID: FnbBeverageCategoryID, Name: "Beverage", Description: "Drinks and beverages", CategoryType: models.CategoryTypeFnB, IsActive: true},
		{ID: FnbServiceCategoryID, Name: "POS Service", Description: "Non-physical service charges", CategoryType: models.CategoryTypeGoods, IsActive: true},
	}
	for _, c := range menuCategories {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "updated_at"}),
		}).Create(&c).Error; err != nil {
			log.Printf("Warning: Failed to seed menu category %s: %v", c.Name, err)
		}
	}

	// === Product Types for F&B ===
	fnbTypes := []models.ProductType{
		{ID: FnbFoodTypeID, Name: "Food", Description: "Prepared food items", IsActive: true},
		{ID: FnbDrinkTypeID, Name: "Drink", Description: "Prepared beverages", IsActive: true},
	}
	for _, t := range fnbTypes {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "description", "updated_at"}),
		}).Create(&t).Error; err != nil {
			log.Printf("Warning: Failed to seed F&B type %s: %v", t.Name, err)
		}
	}

	// === Resolve UOM IDs by name ===
	uomIDs := map[string]string{}
	for _, name := range []string{"Piece", "Gram", "Kilogram", "Liter"} {
		var uom models.UnitOfMeasure
		if err := db.Where("name = ? AND deleted_at IS NULL", name).First(&uom).Error; err != nil {
			log.Printf("Warning: UOM '%s' not found, some products may be incomplete: %v", name, err)
			continue
		}
		uomIDs[name] = uom.ID
	}

	strPtr := func(s string) *string { return &s }

	// === Recipe Products (RECIPE kind, is_pos_available=true) ===
	recipes := []models.Product{
		{
			ID:                 RecipeNasiGorengID,
			Code:               "MENU-NG-001",
			Name:               "Nasi Goreng Special",
			Description:        "Nasi goreng with egg and special seasoning",
			CategoryID:         strPtr(FnbMainCourseCategoryID),
			TypeID:             strPtr(FnbFoodTypeID),
			UomID:              strPtr(uomIDs["Piece"]),
			CostPrice:          0,
			SellingPrice:       35000,
			ProductKind:        models.ProductKindRecipe,
			IsIngredient:       false,
			IsInventoryTracked: false,
			IsPosAvailable:     true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
			IsActive:           true,
		},
		{
			ID:                 RecipeKopiSusuID,
			Code:               "MENU-KS-001",
			Name:               "Kopi Susu",
			Description:        "Coffee with fresh milk",
			CategoryID:         strPtr(FnbBeverageCategoryID),
			TypeID:             strPtr(FnbDrinkTypeID),
			UomID:              strPtr(uomIDs["Piece"]),
			CostPrice:          0,
			SellingPrice:       18000,
			ProductKind:        models.ProductKindRecipe,
			IsIngredient:       false,
			IsInventoryTracked: false,
			IsPosAvailable:     true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
			IsActive:           true,
		},
		{
			ID:                 RecipeEsTehManisID,
			Code:               "MENU-ET-001",
			Name:               "Es Teh Manis",
			Description:        "Iced sweet tea",
			CategoryID:         strPtr(FnbBeverageCategoryID),
			TypeID:             strPtr(FnbDrinkTypeID),
			UomID:              strPtr(uomIDs["Piece"]),
			CostPrice:          0,
			SellingPrice:       8000,
			ProductKind:        models.ProductKindRecipe,
			IsIngredient:       false,
			IsInventoryTracked: false,
			IsPosAvailable:     true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
			IsActive:           true,
		},
	}
	for _, r := range recipes {
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name", "description", "selling_price", "product_kind",
				"is_inventory_tracked", "is_pos_available", "updated_at",
			}),
		}).Create(&r).Error; err != nil {
			log.Printf("Warning: Failed to seed recipe product %s: %v", r.Code, err)
		}
	}

	// === Service Products (SERVICE kind) ===
	services := []models.Product{
		{
			ID:                 ServiceDeliveryFeeID,
			Code:               "SVC-DELIVERY-001",
			Name:               "Delivery Fee",
			Description:        "Standard delivery fee",
			CategoryID:         strPtr(FnbServiceCategoryID),
			UomID:              strPtr(uomIDs["Piece"]),
			CostPrice:          0,
			SellingPrice:       10000,
			ProductKind:        models.ProductKindService,
			IsIngredient:       false,
			IsInventoryTracked: false,
			IsPosAvailable:     true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
			IsActive:           true,
		},
		{
			ID:                 ServiceChargeID,
			Code:               "SVC-CHARGE-001",
			Name:               "Service Charge",
			Description:        "10% service charge for dine-in",
			CategoryID:         strPtr(FnbServiceCategoryID),
			UomID:              strPtr(uomIDs["Piece"]),
			CostPrice:          0,
			SellingPrice:       0,
			ProductKind:        models.ProductKindService,
			IsIngredient:       false,
			IsInventoryTracked: false,
			IsPosAvailable:     true,
			Status:             models.ProductStatusApproved,
			IsApproved:         true,
			IsActive:           true,
		},
	}
	for _, s := range services {
		if err := db.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "code"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"name", "description", "selling_price", "product_kind",
				"is_inventory_tracked", "is_pos_available", "updated_at",
			}),
		}).Create(&s).Error; err != nil {
			log.Printf("Warning: Failed to seed service product %s: %v", s.Code, err)
		}
	}

	// === Recipe Items (BOM lines) ===
	// Resolve ingredient UOM IDs for recipe quantities
	gramUomID := uomIDs["Gram"]
	literUomID := uomIDs["Liter"]
	pcsUomID := uomIDs["Piece"]

	recipeItems := []models.ProductRecipeItem{
		// Nasi Goreng Special: rice 200g + egg 2pcs + cooking oil 30ml + garlic 10g
		{ID: RecItemNGRiceID, ProductID: RecipeNasiGorengID, IngredientProductID: IngredientCookedRiceID, Quantity: 200, UomID: &gramUomID, Notes: "Steamed rice", SortOrder: 1},
		{ID: RecItemNGEggID, ProductID: RecipeNasiGorengID, IngredientProductID: IngredientEggID, Quantity: 2, UomID: &pcsUomID, Notes: "Fried eggs", SortOrder: 2},
		{ID: RecItemNGOilID, ProductID: RecipeNasiGorengID, IngredientProductID: IngredientCookingOilID, Quantity: 0.03, UomID: &literUomID, Notes: "Cooking oil", SortOrder: 3},
		{ID: RecItemNGGarlicID, ProductID: RecipeNasiGorengID, IngredientProductID: IngredientGarlicID, Quantity: 10, UomID: &gramUomID, Notes: "Minced garlic", SortOrder: 4},

		// Kopi Susu: milk 150ml + sugar 20g (coffee bean not in current ingredients, use butter as placeholder)
		{ID: RecItemKSMilkID, ProductID: RecipeKopiSusuID, IngredientProductID: IngredientMilkID, Quantity: 0.15, UomID: &literUomID, Notes: "Fresh milk", SortOrder: 1},
		{ID: RecItemKSSugarID, ProductID: RecipeKopiSusuID, IngredientProductID: IngredientSugarID, Quantity: 20, UomID: &gramUomID, Notes: "Sugar", SortOrder: 2},

		// Es Teh Manis: sugar 30g (tea leaves not in current ingredients)
		{ID: RecItemETSugarID, ProductID: RecipeEsTehManisID, IngredientProductID: IngredientSugarID, Quantity: 30, UomID: &gramUomID, Notes: "Sugar", SortOrder: 1},
	}
	for _, ri := range recipeItems {
		if err := db.Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"quantity", "uom_id", "notes", "sort_order", "updated_at"}),
		}).Create(&ri).Error; err != nil {
			log.Printf("Warning: Failed to seed recipe item %s: %v", ri.ID, err)
		}
	}

	log.Println("POS recipe & service products seeded successfully!")
	return nil
}
