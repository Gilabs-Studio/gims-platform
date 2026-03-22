package seeders

import (
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"

	coreModels "github.com/gilabs/gims/api/internal/core/data/models"
	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	financeModels "github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

// SeedFinanceSprint12 seeds sample Finance data for Sprint 12 (Asset, Closing, Tax, Non-trade Payable).
func SeedFinanceSprint12() error {
	db := database.DB

	log.Println("Seeding finance (Sprint 12): COA, assets, closing, tax invoice, non-trade payable...")

	// 1) Seed minimal Chart of Accounts required by AssetCategory + NonTradePayable + UpCountryCost + YearEndClosing.
	coaSeeds := []financeModels.ChartOfAccount{
		{Code: "1100", Name: "Accounts Receivable", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "11100", Name: "Cash on Hand", Type: financeModels.AccountTypeCashBank, IsActive: true},
		{Code: "11400", Name: "Merchandise Inventory", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "11800", Name: "VAT Input", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "1500", Name: "Fixed Assets", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "1590", Name: "Accumulated Depreciation", Type: financeModels.AccountTypeAsset, IsActive: true},
		{Code: "21000", Name: "Accounts Payable", Type: financeModels.AccountTypeLiability, IsActive: true},
		{Code: "21100", Name: "GR/IR Clearing", Type: financeModels.AccountTypeLiability, IsActive: true},
		{Code: "21200", Name: "Non-Trade Payable", Type: financeModels.AccountTypeLiability, IsActive: true},
		{Code: "21300", Name: "Accrued Expenses", Type: financeModels.AccountTypeLiability, IsActive: true},
		{Code: "31000", Name: "Paid-in Capital", Type: financeModels.AccountTypeEquity, IsActive: true},
		{Code: "32000", Name: "Retained Earnings", Type: financeModels.AccountTypeEquity, IsActive: true},
		{Code: "4100", Name: "Sales Revenue", Type: financeModels.AccountTypeRevenue, IsActive: true},
		{Code: "6100", Name: "Depreciation Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
		{Code: "61000", Name: "Delivery Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
		{Code: "6200", Name: "Office Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
		{Code: "62000", Name: "Travel Expense", Type: financeModels.AccountTypeExpense, IsActive: true},
	}

	for i := range coaSeeds {
		if err := db.
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				DoUpdates: clause.AssignmentColumns([]string{"type", "name", "is_active"}),
			}).
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

	// 4) Seed Assets – includes Phase 2 extended fields
	warrantyStart := time.Now().AddDate(0, -10, 0)
	warrantyEnd := warrantyStart.AddDate(2, 0, 0)
	insStart := warrantyStart
	insEnd := insStart.AddDate(1, 0, 0)
	insValue1 := 15000000.0
	insValue2 := 265000000.0
	serial1 := "SN-LP-20250101"
	serial2 := "SN-PR-20250201"
	serial3 := "VIN-DLV-XJ72941"
	barcode1 := "4901234567890"
	barcode2 := "4901234567891"
	barcode3 := "4901234567892"
	tag1 := "IT-001"
	tag2 := "IT-002"
	tag3 := "VH-001"
	warrantyProvider1 := "Lenovo Indonesia"
	warrantyProvider2 := "HP Indonesia"
	warrantyProvider3 := "Mitsubishi Motors"
	insProvider1 := "Asuransi Astra"
	insProvider2 := "Asuransi Jasindo"
	insPolicy1 := "POL-AST-0001"
	insPolicy2 := "POL-AST-0003"

	assets := []financeModels.Asset{
		{
			Code:             "AST-0001",
			Name:             "Laptop - Finance",
			CategoryID:       officeEquipmentCat.ID,
			LocationID:       headOffice.ID,
			AcquisitionDate:  time.Now().AddDate(0, -10, 0),
			AcquisitionCost:  15000000,
			SalvageValue:     1000000,
			Status:           financeModels.AssetStatusActive,
			SerialNumber:     &serial1,
			Barcode:          &barcode1,
			AssetTag:         &tag1,
			ShippingCost:     150000,
			InstallationCost: 250000,
			TaxAmount:        1500000,
			IsDepreciable:    true,
			IsCapitalized:    true,
			WarrantyStart:    &warrantyStart,
			WarrantyEnd:      &warrantyEnd,
			WarrantyProvider: &warrantyProvider1,
			InsurancePolicyNumber: &insPolicy1,
			InsuranceProvider:     &insProvider1,
			InsuranceStart:        &insStart,
			InsuranceEnd:          &insEnd,
			InsuranceValue:        &insValue1,
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
			SerialNumber:    &serial2,
			Barcode:         &barcode2,
			AssetTag:        &tag2,
			ShippingCost:    100000,
			TaxAmount:       850000,
			IsDepreciable:   true,
			IsCapitalized:   true,
			WarrantyStart:   &warrantyStart,
			WarrantyEnd:     &warrantyEnd,
			WarrantyProvider: &warrantyProvider2,
		},
		{
			Code:             "AST-0003",
			Name:             "Delivery Van",
			CategoryID:       vehiclesCat.ID,
			LocationID:       warehouse.ID,
			AcquisitionDate:  time.Now().AddDate(-1, 0, 0),
			AcquisitionCost:  265000000,
			SalvageValue:     25000000,
			Status:           financeModels.AssetStatusActive,
			SerialNumber:     &serial3,
			Barcode:          &barcode3,
			AssetTag:         &tag3,
			ShippingCost:     5000000,
			InstallationCost: 2500000,
			TaxAmount:        26500000,
			IsDepreciable:    true,
			IsCapitalized:    true,
			WarrantyStart:    &warrantyStart,
			WarrantyEnd:      &warrantyEnd,
			WarrantyProvider: &warrantyProvider3,
			InsurancePolicyNumber: &insPolicy2,
			InsuranceProvider:     &insProvider2,
			InsuranceStart:        &insStart,
			InsuranceEnd:          &insEnd,
			InsuranceValue:        &insValue2,
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

	// 5a) Seed Depreciation records for AST-0001
	now := time.Now()
	var ast1 financeModels.Asset
	if err := db.Where("code = ?", "AST-0001").First(&ast1).Error; err == nil {
		depreciations := []financeModels.AssetDepreciation{
			{
				AssetID:          ast1.ID,
				Period:           now.AddDate(0, -3, 0).Format("2006-01"),
				DepreciationDate: time.Date(now.Year(), now.Month()-3, 28, 0, 0, 0, 0, time.UTC),
				Method:           financeModels.DepreciationMethodStraightLine,
				Amount:           388889,
				Accumulated:      388889,
				BookValue:        14611111,
				Status:           financeModels.AssetDepreciationStatusApproved,
			},
			{
				AssetID:          ast1.ID,
				Period:           now.AddDate(0, -2, 0).Format("2006-01"),
				DepreciationDate: time.Date(now.Year(), now.Month()-2, 28, 0, 0, 0, 0, time.UTC),
				Method:           financeModels.DepreciationMethodStraightLine,
				Amount:           388889,
				Accumulated:      777778,
				BookValue:        14222222,
				Status:           financeModels.AssetDepreciationStatusApproved,
			},
			{
				AssetID:          ast1.ID,
				Period:           now.AddDate(0, -1, 0).Format("2006-01"),
				DepreciationDate: time.Date(now.Year(), now.Month()-1, 28, 0, 0, 0, 0, time.UTC),
				Method:           financeModels.DepreciationMethodStraightLine,
				Amount:           388889,
				Accumulated:      1166667,
				BookValue:        13833333,
				Status:           financeModels.AssetDepreciationStatusPending,
			},
		}

		for i := range depreciations {
			if err := db.
				Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "asset_id"}, {Name: "period"}}, DoNothing: true}).
				Create(&depreciations[i]).Error; err != nil {
				log.Printf("Warning: Failed to create depreciation for %s period %s: %v", ast1.Code, depreciations[i].Period, err)
			}
		}
	}

	// 5b) Seed Transaction records
	var ast2 financeModels.Asset
	_ = db.Where("code = ?", "AST-0002").First(&ast2).Error
	var ast3 financeModels.Asset
	_ = db.Where("code = ?", "AST-0003").First(&ast3).Error

	if ast1.ID != "" {
		transactions := []financeModels.AssetTransaction{
			{
				AssetID:         ast1.ID,
				Type:            financeModels.AssetTransactionTypeAcquire,
				TransactionDate: ast1.AcquisitionDate,
				Amount:          ast1.AcquisitionCost,
				Description:     "Initial acquisition of Laptop - Finance",
				Status:          financeModels.AssetTransactionStatusApproved,
			},
			{
				AssetID:         ast1.ID,
				Type:            financeModels.AssetTransactionTypeDepreciate,
				TransactionDate: now.AddDate(0, -3, 0),
				Amount:          388889,
				Description:     fmt.Sprintf("Monthly depreciation %s", now.AddDate(0, -3, 0).Format("Jan 2006")),
				Status:          financeModels.AssetTransactionStatusApproved,
			},
		}
		if ast3.ID != "" {
			transactions = append(transactions, financeModels.AssetTransaction{
				AssetID:         ast3.ID,
				Type:            financeModels.AssetTransactionTypeAcquire,
				TransactionDate: ast3.AcquisitionDate,
				Amount:          ast3.AcquisitionCost,
				Description:     "Initial acquisition of Delivery Van",
				Status:          financeModels.AssetTransactionStatusApproved,
			})
			transactions = append(transactions, financeModels.AssetTransaction{
				AssetID:         ast3.ID,
				Type:            financeModels.AssetTransactionTypeTransfer,
				TransactionDate: now.AddDate(0, -1, 0),
				Amount:          0,
				Description:     "Transferred from Head Office to Warehouse",
				Status:          financeModels.AssetTransactionStatusApproved,
			})
		}

		for i := range transactions {
			if err := db.Create(&transactions[i]).Error; err != nil {
				log.Printf("Warning: Failed to create transaction: %v", err)
			}
		}
	}

	// 5c) Seed Assignment History
	if ast1.ID != "" {
		ast1UUID, _ := uuid.Parse(ast1.ID)
		hoUUID, _ := uuid.Parse(headOffice.ID)

		assignments := []financeModels.AssetAssignmentHistory{
			{
				AssetID:    ast1UUID,
				LocationID: &hoUUID,
				AssignedAt: ast1.AcquisitionDate,
				Notes:      stringPtr("Assigned upon acquisition to Finance department"),
			},
		}
		if ast3.ID != "" {
			ast3UUID, _ := uuid.Parse(ast3.ID)
			whUUID, _ := uuid.Parse(warehouse.ID)
			returnedAt := now.AddDate(0, -1, 0)
			assignments = append(assignments, financeModels.AssetAssignmentHistory{
				AssetID:      ast3UUID,
				LocationID:   &hoUUID,
				AssignedAt:   ast3.AcquisitionDate,
				ReturnedAt:   &returnedAt,
				ReturnReason: stringPtr("Relocated to warehouse"),
				Notes:        stringPtr("Initially at Head Office"),
			})
			assignments = append(assignments, financeModels.AssetAssignmentHistory{
				AssetID:    ast3UUID,
				LocationID: &whUUID,
				AssignedAt: now.AddDate(0, -1, 0),
				Notes:      stringPtr("Transferred to Warehouse"),
			})
		}

		for i := range assignments {
			if err := db.Create(&assignments[i]).Error; err != nil {
				log.Printf("Warning: Failed to create assignment history: %v", err)
			}
		}
	}

	// 5d) Seed Audit Logs
	if ast1.ID != "" {
		ast1UUID, _ := uuid.Parse(ast1.ID)

		auditLogs := []financeModels.AssetAuditLog{
			{
				AssetID:     ast1UUID,
				Action:      "created",
				PerformedAt: ast1.AcquisitionDate,
				Metadata: financeModels.MapStringInterface{
					"source": "seeder",
					"note":   "Asset initially created",
				},
			},
			{
				AssetID: ast1UUID,
				Action:  "depreciated",
				Changes: financeModels.AuditChanges{
					{Field: "book_value", OldValue: 15000000, NewValue: 14611111},
					{Field: "accumulated_depreciation", OldValue: 0, NewValue: 388889},
				},
				PerformedAt: now.AddDate(0, -3, 0),
			},
		}
		if ast3.ID != "" {
			ast3UUID, _ := uuid.Parse(ast3.ID)
			auditLogs = append(auditLogs, financeModels.AssetAuditLog{
				AssetID:     ast3UUID,
				Action:      "created",
				PerformedAt: ast3.AcquisitionDate,
				Metadata: financeModels.MapStringInterface{
					"source": "seeder",
					"note":   "Fleet vehicle acquired",
				},
			})
			auditLogs = append(auditLogs, financeModels.AssetAuditLog{
				AssetID: ast3UUID,
				Action:  "transferred",
				Changes: financeModels.AuditChanges{
					{Field: "location", OldValue: "Head Office", NewValue: "Warehouse"},
				},
				PerformedAt: now.AddDate(0, -1, 0),
			})
		}

		for i := range auditLogs {
			if err := db.Create(&auditLogs[i]).Error; err != nil {
				log.Printf("Warning: Failed to create audit log: %v", err)
			}
		}
	}

	// 6) Financial closing is a manual process, keeping it as a sample.
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
