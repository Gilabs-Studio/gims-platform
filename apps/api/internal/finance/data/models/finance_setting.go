package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// FinanceSetting stores runtime-configurable finance parameters.
// This replaces hardcoded constants (e.g. COA codes) so they can be changed
// without recompiling the application.
type FinanceSetting struct {
	ID          string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SettingKey  string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"setting_key"`
	Value       string         `gorm:"type:text;not null" json:"value"`
	Description string         `gorm:"type:text" json:"description"`
	Category    string         `gorm:"type:varchar(50);index;default:'general'" json:"category"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (FinanceSetting) TableName() string {
	return "finance_settings"
}

func (s *FinanceSetting) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// Well-known setting keys for COA code mappings.
// These keys are used by the SettingsService to resolve COA codes at runtime.
const (
	// SettingCOANonTradePayable maps to the liability account for NTP (Hutang Non-Dagang).
	// Default value: "21200"
	SettingCOANonTradePayable = "coa.non_trade_payable"

	// SettingCOATravelExpense maps to the expense account for up-country/travel costs.
	// Default value: "62000"
	SettingCOATravelExpense = "coa.travel_expense"

	// SettingCOAAccruedExpense maps to the liability account for accrued expenses (Hutang Biaya).
	// Default value: "21300"
	SettingCOAAccruedExpense = "coa.accrued_expense"

	// SettingCOARetainedEarnings maps to the equity account for retained earnings (Laba Ditahan).
	// Default value: "32000"
	SettingCOARetainedEarnings = "coa.retained_earnings"

	// SettingCOAAccountsPayable maps to the main AP liability account (Hutang Usaha).
	SettingCOAAccountsPayable = "coa.accounts_payable"

	// SettingCOAPurchaseAdvances maps to the advance payment asset account (Uang Muka Pembelian).
	SettingCOAPurchaseAdvances = "coa.purchase_advances"

	// SettingCOAGoodReceiptInvoiceReceipt maps to the clearing account (GR/IR) for received not yet invoiced goods.
	SettingCOAGoodReceiptInvoiceReceipt = "coa.gr_ir"

	// SettingCOAVATIn maps to the VAT Input asset account (PPN Masukan).
	SettingCOAVATIn = "coa.vat_in"

	// SettingCOAOtherExpense maps to the general other expense account for extra costs.
	SettingCOAOtherExpense = "coa.other_expense"
)
