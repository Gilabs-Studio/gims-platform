package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AccountType string

const (
	AccountTypeAsset     AccountType = "asset"
	AccountTypeLiability AccountType = "liability"
	AccountTypeEquity    AccountType = "equity"
	AccountTypeRevenue   AccountType = "revenue"
	AccountTypeExpense   AccountType = "expense"
)

type ChartOfAccount struct {
	ID       string      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code     string      `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	Name     string      `gorm:"type:varchar(200);not null;index" json:"name"`
	Type     AccountType `gorm:"type:varchar(20);not null;index" json:"type"`
	ParentID *string     `gorm:"type:uuid;index" json:"parent_id"`
	Parent   *ChartOfAccount
	Children []ChartOfAccount `gorm:"foreignKey:ParentID" json:"children,omitempty"`

	IsActive bool `gorm:"default:true;index" json:"is_active"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ChartOfAccount) TableName() string {
	return "chart_of_accounts"
}

func (coa *ChartOfAccount) BeforeCreate(tx *gorm.DB) error {
	if coa.ID == "" {
		coa.ID = uuid.New().String()
	}
	return nil
}
