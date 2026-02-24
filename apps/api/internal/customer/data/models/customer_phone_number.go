package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CustomerPhoneNumber represents a phone number associated with a customer
type CustomerPhoneNumber struct {
	ID          string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CustomerID  string         `gorm:"type:uuid;not null;index" json:"customer_id"`
	PhoneNumber string         `gorm:"type:varchar(30);not null" json:"phone_number"`
	Label       string         `gorm:"type:varchar(50)" json:"label"`
	IsPrimary   bool           `gorm:"default:false" json:"is_primary"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for CustomerPhoneNumber
func (CustomerPhoneNumber) TableName() string {
	return "customer_phone_numbers"
}

// BeforeCreate hook to generate UUID
func (cp *CustomerPhoneNumber) BeforeCreate(tx *gorm.DB) error {
	if cp.ID == "" {
		cp.ID = uuid.New().String()
	}
	return nil
}
