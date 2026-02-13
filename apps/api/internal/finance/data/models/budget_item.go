package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BudgetItem struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	BudgetID string `gorm:"type:uuid;not null;index" json:"budget_id"`
	Budget   *Budget `gorm:"foreignKey:BudgetID" json:"-"`

	ChartOfAccountID string          `gorm:"type:uuid;not null;index" json:"chart_of_account_id"`
	ChartOfAccount   *ChartOfAccount `gorm:"foreignKey:ChartOfAccountID" json:"chart_of_account,omitempty"`

	Amount float64 `gorm:"type:numeric(18,2);not null" json:"amount"`
	Memo   string  `gorm:"type:text" json:"memo"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (BudgetItem) TableName() string {
	return "budget_items"
}

func (bi *BudgetItem) BeforeCreate(tx *gorm.DB) error {
	if bi.ID == "" {
		bi.ID = uuid.New().String()
	}
	return nil
}
