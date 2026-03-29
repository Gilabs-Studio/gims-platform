package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// SeedFinanceSettings populates the default finance settings values.
func SeedFinanceSettings() error {
	log.Println("Seeding finance settings...")
	db := database.DB

	defaultSettings := []models.FinanceSetting{
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOARetainedEarnings,
			Value:       "32000", // Standardized to numeric
			Description: "Chart of account code for retained earnings during period closing",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOANonTradePayable,
			Value:       "21200", // Standardized to numeric
			Description: "Chart of account code for Non-Trade Payables",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOATravelExpense,
			Value:       "62000", // Standardized to numeric
			Description: "Chart of account code for Travel/Up-Country Expenses",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAAccruedExpense,
			Value:       "21300", // Standardized to numeric
			Description: "Chart of account code for Accrued Expenses",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAAccountsPayable,
			Value:       "21000", // Hutang Usaha
			Description: "Chart of account code for Trade Payables",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchaseAdvances,
			Value:       "1200", // Uang Muka Pembelian
			Description: "Chart of account code for Purchase Advances",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAGoodReceiptInvoiceReceipt,
			Value:       "21100", // Hutang Belum Ditagih (GR/IR)
			Description: "Chart of account code for GR/IR clearing",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAVATIn,
			Value:       "11800", // PPN Masukan
			Description: "Chart of account code for VAT Input",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAOtherExpense,
			Value:       "61000", // Biaya Lain-lain / Delivery
			Description: "Chart of account code for general other expenses",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  "company.fiscal_year_start_month",
			Value:       "1", // January
			Description: "Fiscal year start month (1-12)",
			Category:    "general",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOASalesReceivable,
			Value:       "1100",
			Description: "Account for trade receivables (Customer Invoice)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOASalesRevenue,
			Value:       "4100",
			Description: "Account for sales revenue",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOASalesVATOut,
			Value:       "21500",
			Description: "Account for VAT output tax",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOASalesAdvance,
			Value:       "21400",
			Description: "Account for customer advances (Down Payment)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchasePayable,
			Value:       "21000",
			Description: "Account for trade payables (Supplier Invoice)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchaseGRIR,
			Value:       "21100",
			Description: "Clearing account for GR/IR",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchaseVATIn,
			Value:       "11800",
			Description: "Account for VAT input tax",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchaseAdvance,
			Value:       "1200",
			Description: "Account for supplier advances (DP Paid)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchaseExpense,
			Value:       "61000",
			Description: "Account for miscellaneous purchase expenses",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOASalesCOGS,
			Value:       "5100",
			Description: "Account for cost of goods sold",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOASalesInventory,
			Value:       "11400",
			Description: "Account for merchandise inventory",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAInventory,
			Value:       "11400",
			Description: "General merchandise inventory asset account",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOASalesReturn,
			Value:       "4200",
			Description: "Account for sales returns and allowances",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchaseReturn,
			Value:       "5200",
			Description: "Account for purchase returns and allowances",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAInventoryAsset,
			Value:       "11400",
			Description: "Inventory Asset Account for adjustments",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAInventoryGain,
			Value:       "49000",
			Description: "Inventory Gain Account (Other Income)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAInventoryLoss,
			Value:       "69000",
			Description: "Inventory Loss Account (Other Expense)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAInventoryAdjustment,
			Value:       "59000",
			Description: "Inventory Adjustment Account (Clearing/COGS)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAFXGain,
			Value:       "49010",
			Description: "FX Gain Account (Other Income)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAFXLoss,
			Value:       "69010",
			Description: "FX Loss Account (Expense)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAFXRemeasurement,
			Value:       "11350",
			Description: "FX Remeasurement Clearing Account",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOADepreciationExpense,
			Value:       "62050",
			Description: "Depreciation Expense Account",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOADepreciationAccumulated,
			Value:       "17100",
			Description: "Accumulated Depreciation Account",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOADepreciationGain,
			Value:       "49020",
			Description: "Depreciation Reversal Gain (Other Income)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOACOGS,
			Value:       "5100",
			Description: "Account for cost of goods sold (Consolidated)",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAGoodReceiptInvoiceReceipt,
			Value:       "21100",
			Description: "Clearing account for GR/IR (Standard)",
			Category:    "coa",
		},
	}

	for _, setting := range defaultSettings {
		if err := db.
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "setting_key"}},
				DoUpdates: clause.AssignmentColumns([]string{"value", "description", "category"}),
			}).
			Create(&setting).Error; err != nil {
			log.Printf("Failed to seed finance setting %s: %v", setting.SettingKey, err)
		}
	}

	return nil
}
