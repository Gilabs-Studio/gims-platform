package models

import (
	"time"
)

// SystemAccountMapping represents a configuration for well-known accounting accounts.
// This table allows the ERP to stay flexible and avoids hardcoding COA codes in Go logic.
type SystemAccountMapping struct {
	ID        string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Key       string    `gorm:"type:varchar(100);not null;uniqueIndex:idx_system_account_mappings_key_company,priority:1" json:"key"` // e.g., "sales.accounts_receivable", "purchase.accounts_payable"
	CompanyID *string   `gorm:"type:uuid;uniqueIndex:idx_system_account_mappings_key_company,priority:2;index" json:"company_id"`     // If null, it's a global default
	COACode   string    `gorm:"type:varchar(20);not null" json:"coa_code"`                                                            // The code in chart_of_accounts
	Label     string    `gorm:"type:varchar(200)" json:"label"`                                                                       // Human readable label for the UI
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (SystemAccountMapping) TableName() string {
	return "system_account_mappings"
}

// Well-known mapping keys
const (
	MappingKeyPurchaseInventoryAsset   = "purchase.inventory_asset"
	MappingKeyPurchaseGRIRClearing     = "purchase.gr_ir_clearing"
	MappingKeyPurchaseTaxInput         = "purchase.tax_input"
	MappingKeyPurchaseAccountsPayable  = "purchase.accounts_payable"
	MappingKeySalesAccountsReceivable  = "sales.accounts_receivable"
	MappingKeySalesRevenueNew          = "sales.revenue"
	MappingKeySalesTaxOutput           = "sales.tax_output"
	MappingKeySalesCOGSNew             = "sales.cogs"
	MappingKeySalesReturnNew           = "sales.sales_return"
	MappingKeyInventoryAdjustmentGain  = "inventory.adjustment_gain"
	MappingKeyInventoryAdjustmentLoss  = "inventory.adjustment_loss"
	MappingKeyAssetAccumDepreciation   = "asset.accumulated_depreciation"
	MappingKeyAssetDepreciationExpense = "asset.depreciation_expense"
	MappingKeyOpeningBalanceEquity     = "finance.opening_balance_equity"
	MappingKeyFinanceBankDefault       = "finance.bank_default"
	MappingKeyFinanceCashDefault       = "finance.cash_default"

	// Sales related
	MappingKeySalesReceivable = "SALES_RECEIVABLE"
	MappingKeySalesRevenue    = "SALES_REVENUE"
	MappingKeySalesVatOutput  = "SALES_VAT_OUTPUT"
	MappingKeySalesAdvance    = "SALES_ADVANCE"
	MappingKeySalesCogs       = "SALES_COGS"
	MappingKeySalesInventory  = "SALES_INVENTORY"

	// Purchase related
	MappingKeyPurchasePayable   = "PURCHASE_PAYABLE"
	MappingKeyPurchaseGrir      = "PURCHASE_GR_IR"
	MappingKeyPurchaseVatInput  = "PURCHASE_VAT_INPUT"
	MappingKeyPurchaseDelivery  = "PURCHASE_DELIVERY_EXPENSE"
	MappingKeyPurchaseOtherCost = "PURCHASE_OTHER_EXPENSE"

	// Finance related
	MappingKeyRetainedEarnings = "RETAINED_EARNINGS"
	MappingKeyClosingSuspense  = "CLOSING_SUSPENSE"
)
