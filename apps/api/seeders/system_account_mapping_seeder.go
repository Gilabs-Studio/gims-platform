package seeders

import (
	"log"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

func SeedSystemAccountMappings() error {
	return EnsureTenantSystemAccountMappings(database.DB, DefaultTenantID)
}

// EnsureTenantSystemAccountMappings provisions canonical mapping rows for a tenant.
// Idempotent: existing tenant rows are updated to latest defaults.
func EnsureTenantSystemAccountMappings(db *gorm.DB, tenantID string) error {
	if db == nil {
		return gorm.ErrInvalidDB
	}
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return gorm.ErrInvalidData
	}

	mappings := []models.SystemAccountMapping{
		// ---------------------------------------------------------------------
		// Sales core mappings
		// ---------------------------------------------------------------------
		{Key: "purchase.inventory_asset", COACode: "11310", Label: "Purchase Inventory Asset"},
		{Key: "purchase.gr_ir_clearing", COACode: "91100", Label: "Purchase GR/IR Clearing"},
		{Key: "purchase.tax_input", COACode: "21200", Label: "Purchase Tax Input"},
		{Key: "purchase.accounts_payable", COACode: "21100", Label: "Purchase Accounts Payable"},
		{Key: "purchase.advance", COACode: "11410", Label: "Purchase Advance"},
		{Key: "purchase.purchase_advance", COACode: "21220", Label: "Supplier Advance"},
		{Key: "purchase.purchase_return", COACode: "51000", Label: "Purchase Return"},
		{Key: "purchase.expense", COACode: "61300", Label: "Purchase Expense"},

		{Key: "sales.accounts_receivable", COACode: "11210", Label: "Sales Accounts Receivable"},
		{Key: "sales.advance", COACode: "21400", Label: "Sales Advance"},
		{Key: "sales.revenue", COACode: "41100", Label: "Sales Revenue"},
		{Key: "sales.tax_output", COACode: "41200", Label: "Sales Tax Output"},
		{Key: "sales.cogs", COACode: "51000", Label: "Sales Cost of Goods Sold"},
		{Key: "sales.inventory_asset", COACode: "11310", Label: "Sales Inventory Asset"},
		{Key: "sales.sales_return", COACode: "41210", Label: "Sales Return"},

		// ---------------------------------------------------------------------
		// Inventory / stock core mappings
		// ---------------------------------------------------------------------
		{Key: "inventory.inventory_asset", COACode: "11310", Label: "Inventory Asset"},
		{Key: "inventory.adjustment_gain", COACode: "41900", Label: "Inventory Adjustment Gain"},
		{Key: "inventory.adjustment_loss", COACode: "51900", Label: "Inventory Adjustment Loss"},
		{Key: "inventory.revaluation_reserve", COACode: "32000", Label: "Inventory Revaluation Reserve"},

		// ---------------------------------------------------------------------
		// Legacy/direct coa.* aliases used by posting profiles and fallbacks
		// ---------------------------------------------------------------------
		{Key: "coa.sales_receivable", COACode: "11210", Label: "Sales Receivable"},
		{Key: "coa.sales_advance", COACode: "21400", Label: "Sales Advance"},
		{Key: "coa.sales_revenue", COACode: "41100", Label: "Sales Revenue"},
		{Key: "coa.sales_vat_out", COACode: "41200", Label: "Sales VAT Out"},
		{Key: "coa.sales_cogs", COACode: "51000", Label: "Sales COGS"},
		{Key: "coa.sales_inventory", COACode: "11310", Label: "Sales Inventory"},
		{Key: "coa.sales_return", COACode: "41210", Label: "Sales Return"},
		{Key: "coa.purchase_payable", COACode: "21100", Label: "Purchase Payable"},
		{Key: "coa.accounts_payable", COACode: "21100", Label: "Accounts Payable"},
		{Key: "coa.purchase_advance", COACode: "11410", Label: "Purchase Advance"},
		{Key: "coa.purchase_advances", COACode: "11410", Label: "Purchase Advances"},
		{Key: "coa.gr_ir", COACode: "91100", Label: "GR/IR"},
		{Key: "coa.purchase_gr_ir", COACode: "91100", Label: "Purchase GR/IR"},
		{Key: "coa.purchase_vat_in", COACode: "21200", Label: "Purchase VAT In"},
		{Key: "coa.purchase_price_diff", COACode: "51300", Label: "Purchase Price Difference"},
		{Key: "coa.vat_in", COACode: "11420", Label: "COA VAT In"},
		{Key: "coa.purchase_expense", COACode: "61300", Label: "Purchase Expense"},
		{Key: "coa.purchase_return", COACode: "51000", Label: "Purchase Return"},
		{Key: "coa.inventory", COACode: "11310", Label: "Inventory"},
		{Key: "coa.inventory_asset", COACode: "11310", Label: "Inventory Asset"},
		{Key: "coa.inventory_gain", COACode: "41900", Label: "Inventory Gain"},
		{Key: "coa.inventory_loss", COACode: "51900", Label: "Inventory Loss"},
		{Key: "coa.inventory_revaluation_reserve", COACode: "32000", Label: "Inventory Revaluation Reserve"},
		{Key: "coa.cogs", COACode: "51000", Label: "COGS"},
		{Key: "coa.sales_receivable_dp", COACode: "11220", Label: "Customer Advance (DP Pelanggan)"},
		{Key: "coa.purchase_payable_dp", COACode: "21220", Label: "Supplier Advance (DP Supplier)"},

		// ---------------------------------------------------------------------
		// Finance / shared defaults
		// ---------------------------------------------------------------------
		{Key: "asset.accumulated_depreciation", COACode: "12241", Label: "Asset Accumulated Depreciation"},
		{Key: "asset.depreciation_expense", COACode: "62430", Label: "Asset Depreciation Expense"},
		{Key: "finance.opening_balance_equity", COACode: "39999", Label: "Finance Opening Balance Equity"},
		{Key: "finance.bank_default", COACode: "11111", Label: "Finance Bank Default"},
		{Key: "finance.cash_default", COACode: "11101", Label: "Finance Cash Default"},
		{Key: "payroll.salary_expense", COACode: "62100", Label: "Payroll Salary Expense"},
		{Key: "payroll.allowance_expense", COACode: "62110", Label: "Payroll Allowance Expense"},
		{Key: "payroll.payable_salary", COACode: "21300", Label: "Payroll Salary Payable"},
		{Key: "payroll.tax_pph21", COACode: "21221", Label: "Payroll Tax PPh21"},
	}

	for _, m := range mappings {
		m.TenantID = tenantID
		m.CompanyID = nil

		var existing models.SystemAccountMapping
		err := db.Where("tenant_id = ? AND key = ? AND company_id IS NULL", tenantID, m.Key).First(&existing).Error
		if err == nil {
			existing.COACode = m.COACode
			existing.Label = m.Label
			if saveErr := db.Save(&existing).Error; saveErr != nil {
				return saveErr
			}
		} else if err == gorm.ErrRecordNotFound {
			if createErr := db.Create(&m).Error; createErr != nil {
				return createErr
			}
		} else {
			return err
		}
		log.Printf("Ensured tenant mapping: tenant=%s key=%s -> %s", tenantID, m.Key, m.COACode)
	}

	return nil
}
