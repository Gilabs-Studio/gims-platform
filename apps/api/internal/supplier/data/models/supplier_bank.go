package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SupplierBank represents a bank account for a supplier
type SupplierBank struct {
	ID            string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SupplierID    string         `gorm:"type:uuid;not null;index" json:"supplier_id"`
	BankID        string         `gorm:"type:uuid;not null;index" json:"bank_id"`
	Bank          *Bank          `gorm:"foreignKey:BankID" json:"bank,omitempty"`
	AccountNumber string         `gorm:"type:varchar(50);not null" json:"account_number"`
	AccountName   string         `gorm:"type:varchar(100);not null" json:"account_name"`
	Branch        string         `gorm:"type:varchar(100)" json:"branch"`
	IsPrimary     bool           `gorm:"default:false" json:"is_primary"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for SupplierBank
func (SupplierBank) TableName() string {
	return "supplier_banks"
}

// BeforeCreate hook to generate UUID
func (s *SupplierBank) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
