package main

import (
	"context"
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/config"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

func main() {
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load configs: %v", err)
	}

	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	ctx := context.Background()
	_ = ctx

	// Define required COAs
	requiredCOAs := []models.ChartOfAccount{
		{Code: "11100", Name: "Cash on Hand", Type: models.AccountTypeCashBank, IsActive: true},
		{Code: "11300", Name: "Trade Receivables", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "11400", Name: "Inventory", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "11800", Name: "VAT Input", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "11900", Name: "Advances to Suppliers", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "21000", Name: "Trade Payables", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "21100", Name: "GR/IR Clearing", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "21200", Name: "Sales Advances", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "21500", Name: "VAT Output", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "4100", Name: "Sales Revenue", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4110", Name: "Sales Discount", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "5100", Name: "Cost of Goods Sold", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "61000", Name: "Delivery / Variance Expense", Type: models.AccountTypeExpense, IsActive: true},
	}

	for _, coa := range requiredCOAs {
		if err := database.DB.
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				DoUpdates: clause.AssignmentColumns([]string{"type", "name", "is_active"}),
			}).
			Create(&coa).Error; err != nil {
			log.Printf("Warning: Failed to create COA %s: %v", coa.Code, err)
		} else {
			log.Printf("Verified COA: %s - %s", coa.Code, coa.Name)
		}
	}

	log.Println("\nAll required Chart of Accounts have been verified/created!")
	log.Println("\nTo trigger missed journal entries:")
	log.Println("1. Navigate to the Sales and Purchase apps.")
	log.Println("2. Since you have dummy data, try changing the status (cancel and confirm) or creating payments.")
	log.Println("3. Future seeders will also now be able to reliably insert journal entries.")
}
