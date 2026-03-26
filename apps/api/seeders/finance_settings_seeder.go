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
