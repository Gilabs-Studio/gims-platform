package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"github.com/google/uuid"
)

// SeedFinanceSettings populates the default finance settings values.
func SeedFinanceSettings() error {
	log.Println("Seeding finance settings...")
	db := database.DB

	defaultSettings := []models.FinanceSetting{
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOARetainedEarnings,
			Value:       "3-3110", // Typical retained earnings Code
			Description: "Chart of account code for retained earnings during period closing",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOANonTradePayable,
			Value:       "2-2140", // Added Hutang Non-Dagang
			Description: "Chart of account code for Non-Trade Payables",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOATravelExpense,
			Value:       "6-6330", // General travel/up-country expense
			Description: "Chart of account code for Travel/Up-Country Expenses",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAAccruedExpense,
			Value:       "2-2120", // Biaya YMH Dibayar (Accrued Expense)
			Description: "Chart of account code for Accrued Expenses",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAAccountsPayable,
			Value:       "2-2100", // Hutang Usaha / Trade Payables
			Description: "Chart of account code for Trade Payables",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAPurchaseAdvances,
			Value:       "1-1190", // Uang Muka Pembelian
			Description: "Chart of account code for Purchase Advances",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAGoodReceiptInvoiceReceipt,
			Value:       "2-2110", // Hutang Belum Ditagih (GR/IR)
			Description: "Chart of account code for GR/IR clearing",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAVATIn,
			Value:       "1-1180", // PPN Masukan
			Description: "Chart of account code for VAT Input",
			Category:    "coa",
		},
		{
			ID:          uuid.New().String(),
			SettingKey:  models.SettingCOAOtherExpense,
			Value:       "6-6100", // Biaya Lain-lain / Delivery
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
	}

	for _, setting := range defaultSettings {
		var count int64
		// Ensure we don't overwrite if it already exists
		db.Model(&models.FinanceSetting{}).Where("setting_key = ?", setting.SettingKey).Count(&count)
		if count == 0 {
			if err := db.Create(&setting).Error; err != nil {
				log.Printf("Failed to seed finance setting %s: %v", setting.SettingKey, err)
			}
		}
	}

	return nil
}
