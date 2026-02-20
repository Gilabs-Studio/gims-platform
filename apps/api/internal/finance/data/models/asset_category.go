package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DepreciationMethod string

const (
	DepreciationMethodStraightLine    DepreciationMethod = "SL"
	DepreciationMethodDecliningBalance DepreciationMethod = "DB"
)

type AssetCategory struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	Name string `gorm:"type:varchar(150);not null;uniqueIndex" json:"name"`

	DepreciationMethod DepreciationMethod `gorm:"type:varchar(10);not null" json:"depreciation_method"`
	UsefulLifeMonths   int                `gorm:"not null" json:"useful_life_months"`
	DepreciationRate   float64            `gorm:"type:numeric(8,4);default:0" json:"depreciation_rate"`

	AssetAccountID             string `gorm:"type:uuid;not null;index" json:"asset_account_id"`
	AccumulatedDepreciationAccountID string `gorm:"type:uuid;not null;index" json:"accumulated_depreciation_account_id"`
	DepreciationExpenseAccountID     string `gorm:"type:uuid;not null;index" json:"depreciation_expense_account_id"`

	IsActive bool `gorm:"default:true" json:"is_active"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AssetCategory) TableName() string {
	return "asset_categories"
}

func (c *AssetCategory) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
