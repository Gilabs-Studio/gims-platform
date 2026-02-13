package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type JournalLine struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	JournalEntryID string        `gorm:"type:uuid;not null;index" json:"journal_entry_id"`
	JournalEntry   *JournalEntry `gorm:"foreignKey:JournalEntryID" json:"journal_entry,omitempty"`

	ChartOfAccountID string          `gorm:"type:uuid;not null;index" json:"chart_of_account_id"`
	ChartOfAccount   *ChartOfAccount `gorm:"foreignKey:ChartOfAccountID" json:"chart_of_account,omitempty"`

	Debit  float64 `gorm:"type:decimal(18,2);default:0" json:"debit"`
	Credit float64 `gorm:"type:decimal(18,2);default:0" json:"credit"`
	Memo   string  `gorm:"type:text" json:"memo"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (JournalLine) TableName() string {
	return "journal_lines"
}

func (jl *JournalLine) BeforeCreate(tx *gorm.DB) error {
	if jl.ID == "" {
		jl.ID = uuid.New().String()
	}
	return nil
}
