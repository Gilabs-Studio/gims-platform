package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm/clause"
)

// SeedChartOfAccounts creates a comprehensive, hierarchical Chart of Accounts
// following global ERP accounting standards (SAP/Odoo style).
// This seeder is IDEMPOTENT and uses ON CONFLICT to prevent duplicates.
//
// Account Range:
// 1000-1999: Assets
// 2000-2999: Liabilities
// 3000-3999: Equity
// 4000-4999: Revenue
// 5000-6999: Expenses/COGS
// 7000-7999: Reserved for adjustments/gains/losses
func SeedChartOfAccounts() error {
	log.Println("Seeding Chart of Accounts...")
	db := database.DB

	coaList := []models.ChartOfAccount{
		// ============================================================================
		// ASSETS (1000-1999)
		// ============================================================================

		// Cash & Bank (1000-1099)
		{Code: "1000", Name: "Cash on Hand", Type: models.AccountTypeCashBank, IsActive: true},
		{Code: "1100", Name: "Bank Accounts", Type: models.AccountTypeCashBank, IsActive: true},

		// Receivables (1200-1299)
		{Code: "1200", Name: "Accounts Receivable", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1210", Name: "Accounts Receivable - Trade", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1220", Name: "Customer Advances (Down Payment Received)", Type: models.AccountTypeAsset, IsActive: true},

		// Prepayments (1300-1399)
		{Code: "1300", Name: "Purchase Advances (Down Payment Paid)", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1310", Name: "Prepaid Insurance", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1320", Name: "Prepaid Rent", Type: models.AccountTypeAsset, IsActive: true},

		// Inventory (1400-1499)
		{Code: "1400", Name: "Inventory - Merchandise", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1410", Name: "Inventory - Raw Materials", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1420", Name: "Inventory - Work in Progress", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1430", Name: "Inventory - Finished Goods", Type: models.AccountTypeAsset, IsActive: true},

		// Tax Assets (1500-1599)
		{Code: "1500", Name: "VAT Input Tax (PPN Masukan)", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1510", Name: "GST Paid", Type: models.AccountTypeAsset, IsActive: true},

		// Fixed Assets (1600-1699)
		{Code: "1600", Name: "Fixed Assets - Gross", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1610", Name: "Land & Buildings", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1620", Name: "Vehicles", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1630", Name: "Equipment & Machinery", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1640", Name: "Office Equipment & Furniture", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1650", Name: "Leasehold Improvements", Type: models.AccountTypeAsset, IsActive: true},

		// Accumulated Depreciation (1700-1799)
		{Code: "1700", Name: "Accumulated Depreciation - Land & Buildings", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1710", Name: "Accumulated Depreciation - Vehicles", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1720", Name: "Accumulated Depreciation - Equipment", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1730", Name: "Accumulated Depreciation - Office Equipment", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1740", Name: "Accumulated Depreciation - Leasehold", Type: models.AccountTypeAsset, IsActive: true},

		// Other Assets (1800-1899)
		{Code: "1800", Name: "Intangible Assets", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1810", Name: "Goodwill", Type: models.AccountTypeAsset, IsActive: true},
		{Code: "1820", Name: "Notes Receivable", Type: models.AccountTypeAsset, IsActive: true},

		// ============================================================================
		// LIABILITIES (2000-2999)
		// ============================================================================

		// Current Payables (2100-2199)
		{Code: "2100", Name: "Accounts Payable", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2110", Name: "Accounts Payable - Trade", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2120", Name: "GR/IR Accrual (Goods Received Not Invoiced)", Type: models.AccountTypeLiability, IsActive: true},

		// Non-Trade Payables (2200-2299)
		{Code: "2200", Name: "Non-Trade Payables", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2210", Name: "Accrued Expenses (Hutang Biaya)", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2220", Name: "Employee Salary Payable", Type: models.AccountTypeLiability, IsActive: true},

		// Tax Liabilities (2300-2399)
		{Code: "2300", Name: "VAT Output Tax Payable (PPN Keluaran)", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2310", Name: "Income Tax Payable", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2320", Name: "Withholding Tax Payable", Type: models.AccountTypeLiability, IsActive: true},

		// Customer Advances (2400-2499)
		{Code: "2400", Name: "Customer Advances (Down Payment Received)", Type: models.AccountTypeLiability, IsActive: true},

		// Other Liabilities (2500-2599)
		{Code: "2500", Name: "Short-term Loans", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2510", Name: "Accrued Interest Payable", Type: models.AccountTypeLiability, IsActive: true},

		// Long-term Liabilities (2600-2699)
		{Code: "2600", Name: "Long-term Loans", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2610", Name: "Bonds Payable", Type: models.AccountTypeLiability, IsActive: true},
		{Code: "2620", Name: "Deferred Tax Liabilities", Type: models.AccountTypeLiability, IsActive: true},

		// ============================================================================
		// EQUITY (3000-3999)
		// ============================================================================

		// Share Capital (3100-3199)
		{Code: "3100", Name: "Share Capital", Type: models.AccountTypeEquity, IsActive: true},
		{Code: "3110", Name: "Common Stock", Type: models.AccountTypeEquity, IsActive: true},
		{Code: "3120", Name: "Treasury Stock", Type: models.AccountTypeEquity, IsActive: true},

		// Reserves (3200-3299)
		{Code: "3200", Name: "Retained Earnings", Type: models.AccountTypeEquity, IsActive: true},
		{Code: "3210", Name: "Legal Reserve", Type: models.AccountTypeEquity, IsActive: true},
		{Code: "3220", Name: "Revaluation Reserve (PSAK/IFRS)", Type: models.AccountTypeEquity, IsActive: true},
		{Code: "3230", Name: "Inventory Revaluation Reserve", Type: models.AccountTypeEquity, IsActive: true},

		// ============================================================================
		// REVENUE (4000-4999)
		// ============================================================================

		// Sales Revenue (4100-4199)
		{Code: "4100", Name: "Sales Revenue", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4110", Name: "Sales Revenue - Domestic", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4120", Name: "Sales Revenue - Export", Type: models.AccountTypeRevenue, IsActive: true},

		// Returns & Allowances (4200-4299)
		{Code: "4200", Name: "Sales Returns & Allowances", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4210", Name: "Sales Discounts", Type: models.AccountTypeRevenue, IsActive: true},

		// Other Income (4300-4999)
		{Code: "4300", Name: "Other Income", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4310", Name: "Inventory Gain (Opname Surplus)", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4320", Name: "Fixed Asset Gain (Sale)", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4330", Name: "FX Gain (Revaluation)", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4340", Name: "Depreciation Reversal Gain", Type: models.AccountTypeRevenue, IsActive: true},
		{Code: "4350", Name: "Interest Income", Type: models.AccountTypeRevenue, IsActive: true},

		// ============================================================================
		// COGS (5000-5499)
		// ============================================================================

		// Inventory Cost (5000-5099)
		{Code: "5000", Name: "Cost of Goods Sold", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "5010", Name: "Inventory Adjustment (Decrease)", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "5020", Name: "Inventory Loss", Type: models.AccountTypeExpense, IsActive: true},

		// Purchase Returns (5100-5199)
		{Code: "5100", Name: "Purchase Returns & Allowances", Type: models.AccountTypeExpense, IsActive: true},

		// ============================================================================
		// OPERATING EXPENSES (5500-6999)
		// ============================================================================

		// Depreciation (5500-5599)
		{Code: "5500", Name: "Depreciation Expense", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "5510", Name: "Depreciation - Buildings", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "5520", Name: "Depreciation - Vehicles", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "5530", Name: "Depreciation - Equipment", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "5540", Name: "Depreciation - Office Equipment", Type: models.AccountTypeExpense, IsActive: true},

		// Salaries & Benefits (6000-6099)
		{Code: "6000", Name: "Salaries & Wages", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6010", Name: "Bonus & Incentives", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6020", Name: "Employee Benefits", Type: models.AccountTypeExpense, IsActive: true},

		// Delivery & Logistics (6100-6199)
		{Code: "6100", Name: "Delivery Expense", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6110", Name: "Freight & Shipping", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6120", Name: "Logistics & Warehousing", Type: models.AccountTypeExpense, IsActive: true},

		// Office & Admin (6200-6299)
		{Code: "6200", Name: "Office Rent", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6210", Name: "Office Utilities (Electricity, Water, Gas)", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6220", Name: "Office Supplies & Materials", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6230", Name: "Office Equipment Maintenance", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6240", Name: "Janitorial & Cleaning", Type: models.AccountTypeExpense, IsActive: true},

		// Travel & Transportation (6300-6399)
		{Code: "6300", Name: "Travel Expense (Trip & Per Diem)", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6310", Name: "Local Transportation", Type: models.AccountTypeExpense, IsActive: true},

		// Marketing & Sales (6400-6499)
		{Code: "6400", Name: "Sales & Marketing Expense", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6410", Name: "Advertising", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6420", Name: "Sales Commission", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6430", Name: "Trade Shows & Events", Type: models.AccountTypeExpense, IsActive: true},

		// Telecommunications (6500-6599)
		{Code: "6500", Name: "Telephone & Internet", Type: models.AccountTypeExpense, IsActive: true},

		// Professional Fees (6600-6699)
		{Code: "6600", Name: "Professional Fees (Audit, Legal, Consulting)", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6610", Name: "Accounting & Bookkeeping Fees", Type: models.AccountTypeExpense, IsActive: true},

		// Insurance (6700-6799)
		{Code: "6700", Name: "Insurance Expense", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6710", Name: "General Liability Insurance", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6720", Name: "Vehicle Insurance", Type: models.AccountTypeExpense, IsActive: true},

		// Taxes & Licenses (6800-6899)
		{Code: "6800", Name: "Licenses & Permits", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6810", Name: "Business & Property Taxes", Type: models.AccountTypeExpense, IsActive: true},

		// Miscellaneous (6900-6999)
		{Code: "6900", Name: "Miscellaneous Expense", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6910", Name: "Training & Development", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "6920", Name: "Donations & Contributions", Type: models.AccountTypeExpense, IsActive: true},

		// ============================================================================
		// ADJUSTMENTS & GAINS/LOSSES (7000-7999)
		// ============================================================================

		// FX Adjustments (7100-7199)
		{Code: "7100", Name: "FX Loss (Revaluation)", Type: models.AccountTypeExpense, IsActive: true},
		{Code: "7110", Name: "FX Remeasurement Adjustment", Type: models.AccountTypeExpense, IsActive: true},

		// Period Adjustments (7200-7299)
		{Code: "7200", Name: "Period Closing Adjustments", Type: models.AccountTypeExpense, IsActive: true},
	}

	// Insert with idempotency: if code exists, skip
	for i := range coaList {
		if err := db.
			Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				DoUpdates: clause.AssignmentColumns([]string{"name", "type", "is_active"}),
			}).
			Create(&coaList[i]).Error; err != nil {
			log.Printf("Warning: Failed to seed COA %s: %v", coaList[i].Code, err)
		}
	}

	log.Println("✓ Chart of Accounts seeded successfully")
	return nil
}
