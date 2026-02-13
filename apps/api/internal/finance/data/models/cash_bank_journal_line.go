package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CashBankJournalLine struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	CashBankJournalID string          `gorm:"type:uuid;not null;index" json:"cash_bank_journal_id"`
	CashBankJournal   *CashBankJournal `gorm:"foreignKey:CashBankJournalID" json:"-"`

	ChartOfAccountID string          `gorm:"type:uuid;not null;index" json:"chart_of_account_id"`
	ChartOfAccount   *ChartOfAccount `gorm:"foreignKey:ChartOfAccountID" json:"chart_of_account,omitempty"`

	ReferenceType *string `gorm:"type:varchar(50);index" json:"reference_type"`
	ReferenceID   *string `gorm:"type:uuid;index" json:"reference_id"`

	Amount float64 `gorm:"type:numeric(18,2);not null" json:"amount"`
	Memo   string  `gorm:"type:text" json:"memo"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (CashBankJournalLine) TableName() string {
	return "cash_bank_journal_lines"
}

func (ln *CashBankJournalLine) BeforeCreate(tx *gorm.DB) error {
	if ln.ID == "" {
		ln.ID = uuid.New().String()
	}
	return nil
}
