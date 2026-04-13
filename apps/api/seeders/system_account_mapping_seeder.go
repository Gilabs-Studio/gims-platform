package seeders

import (
	"log"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/finance/data/models"
	"gorm.io/gorm"
)

func SeedSystemAccountMappings() error {
	mappings := []models.SystemAccountMapping{
		{Key: "purchase.inventory_asset", COACode: "11310", Label: "Purchase Inventory Asset"},
		{Key: "purchase.gr_ir_clearing", COACode: "11440", Label: "Purchase GR/IR Clearing"},
		{Key: "purchase.tax_input", COACode: "11420", Label: "Purchase Tax Input"},
		{Key: "purchase.accounts_payable", COACode: "21100", Label: "Purchase Accounts Payable"},
		{Key: "sales.accounts_receivable", COACode: "11210", Label: "Sales Accounts Receivable"},
		{Key: "sales.revenue", COACode: "41100", Label: "Sales Revenue"},
		{Key: "sales.tax_output", COACode: "21210", Label: "Sales Tax Output"},
		{Key: "sales.cogs", COACode: "51000", Label: "Sales Cost of Goods Sold"},
		{Key: "sales.sales_return", COACode: "41200", Label: "Sales Return"},
		{Key: "inventory.adjustment_gain", COACode: "71300", Label: "Inventory Adjustment Gain"},
		{Key: "inventory.adjustment_loss", COACode: "52100", Label: "Inventory Adjustment Loss"},
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

