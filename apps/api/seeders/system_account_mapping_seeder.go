package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

func SeedSystemAccountMappings() error {
	mappings := []models.SystemAccountMapping{
		// ---------------------------------------------------------------------
		// Sales core mappings
		// ---------------------------------------------------------------------
		{Key: "purchase.inventory_asset", COACode: "11310", Label: "Purchase Inventory Asset"},
		{Key: "purchase.gr_ir_clearing", COACode: "11440", Label: "Purchase GR/IR Clearing"},
		{Key: "purchase.tax_input", COACode: "11420", Label: "Purchase Tax Input"},
		{Key: "purchase.accounts_payable", COACode: "21100", Label: "Purchase Accounts Payable"},
		{Key: "purchase.advance", COACode: "11410", Label: "Purchase Advance"},
		{Key: "purchase.purchase_return", COACode: "51000", Label: "Purchase Return"},
		{Key: "purchase.expense", COACode: "61300", Label: "Purchase Expense"},

		{Key: "sales.accounts_receivable", COACode: "11210", Label: "Sales Accounts Receivable"},
		{Key: "sales.advance", COACode: "21400", Label: "Sales Advance"},
		{Key: "sales.revenue", COACode: "41100", Label: "Sales Revenue"},
		{Key: "sales.tax_output", COACode: "21210", Label: "Sales Tax Output"},
		{Key: "sales.cogs", COACode: "51000", Label: "Sales Cost of Goods Sold"},
		{Key: "sales.inventory_asset", COACode: "11310", Label: "Sales Inventory Asset"},
		{Key: "sales.sales_return", COACode: "41200", Label: "Sales Return"},

		// ---------------------------------------------------------------------
		// Inventory / stock core mappings
		// ---------------------------------------------------------------------
		{Key: "inventory.inventory_asset", COACode: "11310", Label: "Inventory Asset"},
		{Key: "inventory.adjustment_gain", COACode: "71300", Label: "Inventory Adjustment Gain"},
		{Key: "inventory.adjustment_loss", COACode: "52100", Label: "Inventory Adjustment Loss"},
		{Key: "inventory.revaluation_reserve", COACode: "32000", Label: "Inventory Revaluation Reserve"},

		// ---------------------------------------------------------------------
		// Legacy/direct coa.* aliases used by posting profiles and fallbacks
		// ---------------------------------------------------------------------
		{Key: "coa.sales_receivable", COACode: "11210", Label: "COA Sales Receivable"},
		{Key: "coa.sales_advance", COACode: "21400", Label: "COA Sales Advance"},
		{Key: "coa.sales_revenue", COACode: "41100", Label: "COA Sales Revenue"},
		{Key: "coa.sales_vat_out", COACode: "21210", Label: "COA Sales VAT Out"},
		{Key: "coa.sales_cogs", COACode: "51000", Label: "COA Sales COGS"},
		{Key: "coa.sales_inventory", COACode: "11310", Label: "COA Sales Inventory"},
		{Key: "coa.sales_return", COACode: "41200", Label: "COA Sales Return"},
		{Key: "coa.purchase_payable", COACode: "21100", Label: "COA Purchase Payable"},
		{Key: "coa.accounts_payable", COACode: "21100", Label: "COA Accounts Payable"},
		{Key: "coa.purchase_advance", COACode: "11410", Label: "COA Purchase Advance"},
		{Key: "coa.purchase_advances", COACode: "11410", Label: "COA Purchase Advances"},
		{Key: "coa.gr_ir", COACode: "11440", Label: "COA GR/IR"},
		{Key: "coa.purchase_gr_ir", COACode: "11440", Label: "COA Purchase GR/IR"},
		{Key: "coa.purchase_vat_in", COACode: "11420", Label: "COA Purchase VAT In"},
		{Key: "coa.vat_in", COACode: "11420", Label: "COA VAT In"},
		{Key: "coa.purchase_expense", COACode: "61300", Label: "COA Purchase Expense"},
		{Key: "coa.purchase_return", COACode: "51000", Label: "COA Purchase Return"},
		{Key: "coa.inventory", COACode: "11310", Label: "COA Inventory"},
		{Key: "coa.inventory_asset", COACode: "11310", Label: "COA Inventory Asset"},
		{Key: "coa.inventory_gain", COACode: "71300", Label: "COA Inventory Gain"},
		{Key: "coa.inventory_loss", COACode: "52100", Label: "COA Inventory Loss"},
		{Key: "coa.inventory_revaluation_reserve", COACode: "32000", Label: "COA Inventory Revaluation Reserve"},
		{Key: "coa.cogs", COACode: "51000", Label: "COA COGS"},

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
		{Key: "payroll.tax_pph21", COACode: "21220", Label: "Payroll Tax PPh21"},
	}

	for _, m := range mappings {
		var existing models.SystemAccountMapping
		err := database.DB.Where("key = ? AND company_id IS NULL", m.Key).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			if err := database.DB.Create(&m).Error; err != nil {
				return err
			}
			log.Printf("Seeded account mapping: %s -> %s", m.Key, m.COACode)
		} else if err == nil {
			// Update if already exists (to reflect latest seeder defaults)
			existing.COACode = m.COACode
			existing.Label = m.Label
			database.DB.Save(&existing)
		}
	}

	return nil
}
