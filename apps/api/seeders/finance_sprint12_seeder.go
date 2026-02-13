package seeders

import (
	"log"
	"time"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

// SeedFinanceSprint12 seeds sample Finance data for Sprint 12 (Asset, Closing, Tax, Non-trade Payable).
func SeedFinanceSprint12() error {
	db := database.DB

	log.Println("Seeding finance (Sprint 12): COA, assets, closing, tax invoice, non-trade payable...")

	// 1) Seed minimal Chart of Accounts required by AssetCategory + NonTradePayable.
	coaSeeds := []financeModels.ChartOfAccount{
		{Code: "1100", Name: "Accounts Receivable", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "1500", Name: "Fixed Assets", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "1590", Name: "Accumulated Depreciation", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "2100", Name: "Accounts Payable", Type: financeModels.AccountTypeLiability, IsActive: true},
		{Code: "4100", Name: "Sales Revenue", Type: financeModels.AccountTypeRevenue, IsActive: true},
		{Code: "6100", Name: "Depreciation Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
		{Code: "6200", Name: "Office Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
	}

	for i := range coaSeeds {
		if err := db.
			Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "code"}}, DoNothing: true}).
			Create(&coaSeeds[i]).Error; err != nil {
			log.Printf("Warning: Failed to create COA %s: %v", coaSeeds[i].Code, err)
		}
	}

	var fixedAssetCOA financeModels.ChartOfAccount
	_ = db.Where("code = ?", "1500").First(&fixedAssetCOA).Error
	var accumDepCOA financeModels.ChartOfAccount
	_ = db.Where("code = ?", "1590").First(&accumDepCOA).Error
	var depExpenseCOA financeModels.ChartOfAccount
	_ = db.Where("code = ?", "6100").First(&depExpenseCOA).Error
	var officeExpenseCOA financeModels.ChartOfAccount
	_ = db.Where("code = ?", "6200").First(&officeExpenseCOA).Error

	// 2) Seed Asset Locations
	locations := []financeModels.AssetLocation{
		{Name: "Head Office", Description: "Main office location"},
		{Name: "Warehouse", Description: "Warehouse location"},
		{Name: "Branch Office", Description: "Branch location"},
	}
	for i := range locations {
		if err := db.
			Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "name"}}, DoNothing: true}).
			Create(&locations[i]).Error; err != nil {
			log.Printf("Warning: Failed to create asset location %s: %v", locations[i].Name, err)
		}
	}

	var headOffice financeModels.AssetLocation
	_ = db.Where("name = ?", "Head Office").First(&headOffice).Error
	var warehouse financeModels.AssetLocation
	_ = db.Where("name = ?", "Warehouse").First(&warehouse).Error

	// 3) Seed Asset Categories (requires COA ids)
	categories := []financeModels.AssetCategory{
		{
			Name:                             "Office Equipment",
			DepreciationMethod:               financeModels.DepreciationMethodStraightLine,
			UsefulLifeMonths:                 36,
			DepreciationRate:                 0,
			AssetAccountID:                   fixedAssetCOA.ID,
			AccumulatedDepreciationAccountID: accumDepCOA.ID,
			DepreciationExpenseAccountID:     depExpenseCOA.ID,
			IsActive:                         true,
		},
		{
			Name:                             "Vehicles",
			DepreciationMethod:               financeModels.DepreciationMethodDecliningBalance,
			UsefulLifeMonths:                 60,
			DepreciationRate:                 0.2000,
			AssetAccountID:                   fixedAssetCOA.ID,
			AccumulatedDepreciationAccountID: accumDepCOA.ID,
			DepreciationExpenseAccountID:     depExpenseCOA.ID,
			IsActive:                         true,
		},
	}

	for i := range categories {
		// If COA ids are not available for some reason, skip category creation to avoid FK errors.
		if categories[i].AssetAccountID == "" || categories[i].AccumulatedDepreciationAccountID == "" || categories[i].DepreciationExpenseAccountID == "" {
			log.Printf("Warning: Skipping asset category %s because COA IDs are missing", categories[i].Name)
			continue
		}

		if err := db.
			Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "name"}}, DoNothing: true}).
			Create(&categories[i]).Error; err != nil {
			log.Printf("Warning: Failed to create asset category %s: %v", categories[i].Name, err)
		}
	}

	var officeEquipmentCat financeModels.AssetCategory
	_ = db.Where("name = ?", "Office Equipment").First(&officeEquipmentCat).Error
	var vehiclesCat financeModels.AssetCategory
	_ = db.Where("name = ?", "Vehicles").First(&vehiclesCat).Error

	// 4) Seed Assets
	assets := []financeModels.Asset{
		{
			Code:            "AST-0001",
			Name:            "Laptop - Finance",
			CategoryID:      officeEquipmentCat.ID,
			LocationID:      headOffice.ID,
			AcquisitionDate: time.Now().AddDate(0, -10, 0),
			AcquisitionCost: 15000000,
			SalvageValue:    1000000,
			Status:          financeModels.AssetStatusActive,
		},
		{
			Code:            "AST-0002",
			Name:            "Office Printer",
			CategoryID:      officeEquipmentCat.ID,
			LocationID:      headOffice.ID,
			AcquisitionDate: time.Now().AddDate(0, -14, 0),
			AcquisitionCost: 8500000,
			SalvageValue:    500000,
			Status:          financeModels.AssetStatusActive,
		},
		{
			Code:            "AST-0003",
			Name:            "Delivery Van",
			CategoryID:      vehiclesCat.ID,
			LocationID:      warehouse.ID,
			AcquisitionDate: time.Now().AddDate(-1, 0, 0),
			AcquisitionCost: 265000000,
			SalvageValue:    25000000,
			Status:          financeModels.AssetStatusActive,
		},
	}

	for i := range assets {
		if assets[i].CategoryID == "" || assets[i].LocationID == "" {
			log.Printf("Warning: Skipping asset %s because category/location is missing", assets[i].Code)
			continue
		}

		if err := db.
			Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "code"}}, DoNothing: true}).
			Create(&assets[i]).Error; err != nil {
			log.Printf("Warning: Failed to create asset %s: %v", assets[i].Code, err)
		}
	}

	// 5) Seed a sample Financial Closing (draft) for the last month end.
	now := time.Now()
	firstOfThisMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonthEnd := firstOfThisMonth.AddDate(0, 0, -1)

	closing := financeModels.FinancialClosing{
		PeriodEndDate: lastMonthEnd,
		Status:        financeModels.FinancialClosingStatusDraft,
		Notes:         "Seeded period closing (draft)",
	}

	if err := db.
		Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "period_end_date"}}, DoNothing: true}).
		Create(&closing).Error; err != nil {
		log.Printf("Warning: Failed to create financial closing: %v", err)
	}

	// 6) Seed a sample Tax Invoice (no linked invoice by default).
	taxInvoice := financeModels.TaxInvoice{
		TaxInvoiceNumber: "010.000-26.00000001",
		TaxInvoiceDate:   now.AddDate(0, -1, 0),
		DPPAmount:        10000000,
		VATAmount:        1100000,
		TotalAmount:      11100000,
		Notes:            "Seeded e-Faktur sample",
	}
	if err := db.
		Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "tax_invoice_number"}}, DoNothing: true}).
		Create(&taxInvoice).Error; err != nil {
		log.Printf("Warning: Failed to create tax invoice: %v", err)
	}

	// 7) Seed a sample Non-trade Payable.
	var nonTradeCount int64
	db.Model(&financeModels.NonTradePayable{}).Count(&nonTradeCount)
	if nonTradeCount == 0 {
		if officeExpenseCOA.ID == "" {
			log.Printf("Warning: Skipping non-trade payable seeding because office expense COA is missing")
			return nil
		}

		due := now.AddDate(0, 0, 14)
		payables := []financeModels.NonTradePayable{
			{
				TransactionDate:  now.AddDate(0, 0, -7),
				Description:      "Office supplies expense",
				ChartOfAccountID: officeExpenseCOA.ID,
				Amount:           250000,
				VendorName:       "PT Office Supply",
				DueDate:          &due,
				ReferenceNo:      "NTP-0001",
			},
			{
				TransactionDate:  now.AddDate(0, 0, -3),
				Description:      "Internet subscription",
				ChartOfAccountID: officeExpenseCOA.ID,
				Amount:           1750000,
				VendorName:       "ISP Provider",
				DueDate:          &due,
				ReferenceNo:      "NTP-0002",
			},
		}
		for i := range payables {
			if err := db.Create(&payables[i]).Error; err != nil {
				log.Printf("Warning: Failed to create non-trade payable %s: %v", payables[i].ReferenceNo, err)
			}
		}
	} else {
		log.Println("Non-trade payables already seeded, skipping...")
	}

	return nil
}
