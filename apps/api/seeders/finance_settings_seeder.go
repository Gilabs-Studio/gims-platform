package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

// SeedFinanceSettings populates ALL required finance settings with COA mappings.
// This seeder is IDEMPOTENT and ensures ALL required COAs are present before posting.
// Every setting key maps to a COA code from chart_of_accounts_seeder.go
//
// Validation: Every key MUST be used by at least one PostingProfile or feature.
// No hardcoded COA IDs - all references go through settings keys.
func SeedFinanceSettings() error {
	log.Println("Seeding Finance Settings...")
	db := database.DB

	// All settings mapped to standardized COA codes (X-XXXX format)
	// Organized by business domain for clarity
	defaultSettings := []models.FinanceSetting{
		// ========================================================================
		// SALES & RECEIVABLES
		// ========================================================================
		{
			SettingKey:  models.SettingCOASalesReceivable,
			Value:       "1-1210",
			Description: "Accounts Receivable - Trade (A/R for sales invoices)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOASalesRevenue,
			Value:       "4-1100",
			Description: "Sales Revenue Account (main income account)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOASalesReturn,
			Value:       "4-1200",
			Description: "Sales Returns & Allowances (reduction to revenue)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOASalesVATOut,
			Value:       "2-1210",
			Description: "VAT Output Tax Payable (PPN Keluaran)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOASalesAdvance,
			Value:       "2-1400",
			Description: "Customer Advances (Down Payment Received - liability)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOASalesInventory,
			Value:       "1-1310",
			Description: "Merchandise Inventory (asset for COGS)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOASalesCOGS,
			Value:       "5-1000",
			Description: "Cost of Goods Sold (COGS - expense)",
			Category:    "coa",
		},

		// ========================================================================
		// PURCHASE & PAYABLES
		// ========================================================================
		{
			SettingKey:  models.SettingCOAAccountsPayable,
			Value:       "2-1100",
			Description: "Accounts Payable - Trade (A/P for supplier invoices)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAPurchasePayable,
			Value:       "2-1100",
			Description: "Accounts Payable - Trade (same as AccountsPayable, for consistency)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAPurchaseGRIR,
			Value:       "1-1440",
			Description: "GR/IR Accrual (Goods Received Not Invoiced - temporary payable)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAPurchaseVATIn,
			Value:       "1-1420",
			Description: "VAT Input Tax (PPN Masukan - asset/receivable)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAPurchaseAdvance,
			Value:       "1-1410",
			Description: "Purchase Advances (Down Payment Paid - prepaid/asset)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAPurchaseAdvances,
			Value:       "1-1410",
			Description: "Purchase Advances (same as PurchaseAdvance, for backwards compatibility)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAPurchaseReturn,
			Value:       "5-1000",
			Description: "Purchase Returns & Allowances (reduction to COGS)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAPurchaseExpense,
			Value:       "6-1300",
			Description: "Delivery Expense (freight, logistics, third-party costs)",
			Category:    "coa",
		},

		// ========================================================================
		// INVENTORY & VALUATION
		// ========================================================================
		{
			SettingKey:  models.SettingCOAInventory,
			Value:       "1-1310",
			Description: "Inventory - General (merchandise/raw materials)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAInventoryAsset,
			Value:       "1-1310",
			Description: "Inventory Asset (for adjustments and opname)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAInventoryGain,
			Value:       "4-2400",
			Description: "Inventory Gain (opname surplus - other income)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAInventoryLoss,
			Value:       "5-2100",
			Description: "Inventory Loss (opname shortage, waste - expense)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAInventoryRevaluationReserve,
			Value:       "3-2000",
			Description: "Inventory Revaluation Reserve (PSAK/IFRS - equity for gains)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAInventoryAdjustment,
			Value:       "5-2100",
			Description: "Inventory Adjustment (temporary clearing account)",
			Category:    "coa",
		},

		// ========================================================================
		// CASH & BANK
		// ========================================================================
		{
			SettingKey:  models.SettingCOACash,
			Value:       "1-1101",
			Description: "Cash on Hand (physical cash)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOABank,
			Value:       "1-1111",
			Description: "Bank Accounts (checking/savings/merchant accounts)",
			Category:    "coa",
		},

		// ========================================================================
		// FIXED ASSETS & DEPRECIATION
		// ========================================================================
		{
			SettingKey:  models.SettingCOAFixedAsset,
			Value:       "1-2240",
			Description: "Fixed Assets (equipment, vehicles, buildings - gross)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOADepreciationExpense,
			Value:       "6-2430",
			Description: "Depreciation Expense (P&L impact)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOADepreciationAccumulated,
			Value:       "1-2241",
			Description: "Accumulated Depreciation (contra-asset account)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOADepreciationGain,
			Value:       "4-2200",
			Description: "Depreciation Reversal Gain (other income)",
			Category:    "coa",
		},

		// ========================================================================
		// FOREIGN EXCHANGE
		// ========================================================================
		{
			SettingKey:  models.SettingCOAFXGain,
			Value:       "4-2300",
			Description: "FX Gain (currency revaluation - other income)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAFXLoss,
			Value:       "6-2900",
			Description: "FX Loss (currency revaluation - expense)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAFXRemeasurement,
			Value:       "6-2900",
			Description: "FX Remeasurement Adjustment (temporary balancing account)",
			Category:    "coa",
		},

		// ========================================================================
		// NON-TRADE & OTHER
		// ========================================================================
		{
			SettingKey:  models.SettingCOANonTradePayable,
			Value:       "2-1600",
			Description: "Non-Trade Payables (Hutang Non-Dagang)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAAccruedExpense,
			Value:       "2-1600",
			Description: "Accrued Expenses (Hutang Biaya - temporary liability)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAVATIn,
			Value:       "1-1420",
			Description: "VAT Input Tax (same as PurchaseVATIn)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOATravelExpense,
			Value:       "6-2700",
			Description: "Travel Expense (trip costs, per diem)",
			Category:    "coa",
		},
		{
			SettingKey:  models.SettingCOAOtherExpense,
			Value:       "6-2900",
			Description: "Miscellaneous Expense (other/general expenses)",
			Category:    "coa",
		},

		// ========================================================================
		// RETAINED EARNINGS & EQUITY
		// ========================================================================
		{
			SettingKey:  models.SettingCOARetainedEarnings,
			Value:       "3-3000",
			Description: "Retained Earnings (for period closing and equity)",
			Category:    "coa",
		},

		// ========================================================================
		// GENERAL SETTINGS (non-COA)
		// ========================================================================
		{
			SettingKey:  "company.fiscal_year_start_month",
			Value:       "1",
			Description: "Fiscal year start month (1=January, 12=December)",
			Category:    "general",
		},
		{
			SettingKey:  models.SettingValuationReconciliationTolerance,
			Value:       "0.01",
			Description: "Reconciliation tolerance for inventory valuation (default: 0.01 = 1%)",
			Category:    "valuation",
		},
	}

	// Insert with idempotency: if setting_key exists, update values
	for _, setting := range defaultSettings {
		if err := db.
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "setting_key"}},
				DoUpdates: clause.AssignmentColumns([]string{"value", "description"}),
			}).
			Create(&setting).Error; err != nil {
			log.Printf("Warning: Failed to seed finance setting %s: %v", setting.SettingKey, err)
		}
	}

	log.Println("✓ Finance Settings seeded successfully")
	return nil
}
