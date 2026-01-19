package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SupplierPhoneNumber represents a phone number for a supplier
type SupplierPhoneNumber struct {
	ID          string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SupplierID  string         `gorm:"type:uuid;not null;index" json:"supplier_id"`
	PhoneNumber string         `gorm:"type:varchar(30);not null" json:"phone_number"`
	Label       string         `gorm:"type:varchar(50)" json:"label"` // e.g., "Office", "Mobile", "Fax"
	IsPrimary   bool           `gorm:"default:false" json:"is_primary"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for SupplierPhoneNumber
func (SupplierPhoneNumber) TableName() string {
	return "supplier_phone_numbers"
}

// BeforeCreate hook to generate UUID
func (s *SupplierPhoneNumber) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
