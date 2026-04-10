package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// MidtransEnvironment defines Midtrans API environment
type MidtransEnvironment string

const (
	MidtransEnvironmentSandbox    MidtransEnvironment = "sandbox"
	MidtransEnvironmentProduction MidtransEnvironment = "production"
)

// MidtransConfig holds per-company Midtrans payment gateway credentials
type MidtransConfig struct {
	ID          string              `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CompanyID   string              `gorm:"type:uuid;not null;uniqueIndex" json:"company_id"`
	ServerKey   string              `gorm:"type:varchar(255);not null" json:"-"` // never expose in response
	ClientKey   string              `gorm:"type:varchar(255);not null" json:"client_key"`
	MerchantID  string              `gorm:"type:varchar(100)" json:"merchant_id"`
	Environment MidtransEnvironment `gorm:"type:varchar(20);default:'sandbox'" json:"environment"`
	IsActive    bool                `gorm:"default:true" json:"is_active"`
	UpdatedBy   *string             `gorm:"type:uuid" json:"updated_by"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
	DeletedAt   gorm.DeletedAt      `gorm:"index" json:"-"`
}

func (MidtransConfig) TableName() string {
	return "pos_midtrans_configs"
}

func (m *MidtransConfig) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}
