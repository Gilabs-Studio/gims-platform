package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NonTradePayable struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	TransactionDate time.Time `gorm:"type:date;not null;index" json:"transaction_date"`
	Description     string    `gorm:"type:text" json:"description"`

	ChartOfAccountID string  `gorm:"type:uuid;not null;index" json:"chart_of_account_id"`
	Amount           float64 `gorm:"type:numeric(18,2);not null" json:"amount"`

	VendorName string     `gorm:"type:varchar(200)" json:"vendor_name"`
	DueDate    *time.Time `gorm:"type:date;index" json:"due_date"`
	ReferenceNo string    `gorm:"type:varchar(100);index" json:"reference_no"`

	CreatedBy *string `gorm:"type:uuid" json:"created_by"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (NonTradePayable) TableName() string {
	return "non_trade_payables"
}

func (n *NonTradePayable) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = uuid.New().String()
	}
	return nil
}
