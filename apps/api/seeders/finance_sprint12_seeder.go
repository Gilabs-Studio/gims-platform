package seeders

import (
	"fmt"
	"log"
	"time"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
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
		{Code: "11100", Name: "Cash on Hand", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "11400", Name: "Merchandise Inventory", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "11800", Name: "VAT Input", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "1500", Name: "Fixed Assets", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "1590", Name: "Accumulated Depreciation", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "21000", Name: "Accounts Payable", Type: financeModels.AccountTypeLiability, IsActive: true},
		{Code: "21100", Name: "GR/IR Clearing", Type: financeModels.AccountTypeLiability, IsActive: true},
		{Code: "4100", Name: "Sales Revenue", Type: financeModels.AccountTypeRevenue, IsActive: true},
		{Code: "6100", Name: "Depreciation Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
		{Code: "61000", Name: "Delivery Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
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

	// 6) Financial closing is a manual process, keeping it as a sample.
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

	// 7) Seed a sample Non-trade Payable.
	var nonTradeCount int64
	db.Model(&financeModels.NonTradePayable{}).Count(&nonTradeCount)
	if nonTradeCount == 0 {
		if officeExpenseCOA.ID == "" {
			log.Printf("Warning: Skipping non-trade payable seeding because office expense COA is missing")
		} else {
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
		}
	}

	// 8) Seed Budgets
	var budgetCount int64
	db.Model(&financeModels.Budget{}).Count(&budgetCount)
	if budgetCount == 0 {
		marketingCoa := "6200" // Office/General as fallback
		budget := financeModels.Budget{
			Name:        fmt.Sprintf("Operational Budget %d", now.Year()),
			Description: "Annual operational and marketing budget",
			StartDate:   time.Date(now.Year(), 1, 1, 0, 0, 0, 0, time.UTC),
			EndDate:     time.Date(now.Year(), 12, 31, 23, 59, 59, 0, time.UTC),
			TotalAmount: 500000000,
			Status:      financeModels.BudgetStatusApproved,
			Items: []financeModels.BudgetItem{
				{
					ChartOfAccountID: officeExpenseCOA.ID,
					Amount:           300000000,
					Memo:             "General office expenses",
				},
			},
		}
		if marketingCoa != "" {
			var mkt financeModels.ChartOfAccount
			if err := db.Where("code = ?", marketingCoa).First(&mkt).Error; err == nil {
				budget.Items = append(budget.Items, financeModels.BudgetItem{
					ChartOfAccountID: mkt.ID,
					Amount:           200000000,
					Memo:             "Marketing activities",
				})
			}
		}
		if err := db.Create(&budget).Error; err != nil {
			log.Printf("Warning: Failed to seed budget: %v", err)
		}
	}

	// 9) Seed Payments (General/Sales side)
	var paymentCount int64
	db.Model(&financeModels.Payment{}).Count(&paymentCount)
	if paymentCount == 0 {
		var ba coreModels.BankAccount
		if err := db.First(&ba).Error; err == nil {
			arCoa := "1100" // AR
			var ar financeModels.ChartOfAccount
			if err := db.Where("code = ?", arCoa).First(&ar).Error; err == nil {
				payment := financeModels.Payment{
					PaymentDate:   now.AddDate(0, 0, -2),
					Description:   "Customer payment collection - Batch A",
					BankAccountID: ba.ID,
					TotalAmount:   25000000,
					Status:        financeModels.PaymentStatusPosted,
					Allocations: []financeModels.PaymentAllocation{
						{
							ChartOfAccountID: ar.ID,
							Amount:           25000000,
							Memo:             "Invoice INV-2024-001 collection",
						},
					},
				}
				if err := db.Create(&payment).Error; err != nil {
					log.Printf("Warning: Failed to seed payment: %v", err)
				}
			}
		}
	}

	// 10) Seed Cash/Bank Journals
	var cbCount int64
	db.Model(&financeModels.CashBankJournal{}).Count(&cbCount)
	if cbCount == 0 {
		var ba coreModels.BankAccount
		if err := db.First(&ba).Error; err == nil {
			if officeExpenseCOA.ID != "" {
				cbj := financeModels.CashBankJournal{
					TransactionDate: now.AddDate(0, 0, -1),
					Type:            financeModels.CashBankTypeCashOut,
					Description:     "Monthly Bank Service Fee",
					BankAccountID:   ba.ID,
					TotalAmount:     50000,
					Status:          financeModels.CashBankStatusPosted,
					Lines: []financeModels.CashBankJournalLine{
						{
							ChartOfAccountID: officeExpenseCOA.ID,
							Amount:           50000,
							Memo:             "Bank maintenance fee",
						},
					},
				}
				if err := db.Create(&cbj).Error; err != nil {
					log.Printf("Warning: Failed to seed cash bank journal: %v", err)
				}
			}
		}
	}

	return nil
}
