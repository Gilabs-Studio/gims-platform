package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BankAccount represents a company bank account (cash/bank) used for payments.
type BankAccount struct {
	ID            string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name          string         `gorm:"type:varchar(150);not null;index" json:"name"`
	AccountNumber string         `gorm:"type:varchar(50);not null;index" json:"account_number"`
	AccountHolder string         `gorm:"type:varchar(150);not null" json:"account_holder"`
	Currency      string         `gorm:"type:varchar(10);not null;default:'IDR';index" json:"currency"`
	ChartOfAccountID *string     `gorm:"type:uuid;index" json:"chart_of_account_id"`
	IsActive      bool           `gorm:"default:true;index" json:"is_active"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (BankAccount) TableName() string {
	return "bank_accounts"
}

func (b *BankAccount) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}
