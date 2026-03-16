package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AssetBudgetStatus string

const (
	AssetBudgetStatusDraft     AssetBudgetStatus = "draft"
	AssetBudgetStatusActive    AssetBudgetStatus = "active"
	AssetBudgetStatusClosed    AssetBudgetStatus = "closed"
	AssetBudgetStatusCancelled AssetBudgetStatus = "cancelled"
)

type AssetBudget struct {
	ID          string            `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	BudgetCode  string            `gorm:"type:varchar(50);not null;uniqueIndex" json:"budget_code"`
	BudgetName  string            `gorm:"type:varchar(200);not null" json:"budget_name"`
	Description string            `gorm:"type:text" json:"description"`
	FiscalYear  int               `gorm:"not null;index" json:"fiscal_year"`
	StartDate   time.Time         `gorm:"type:date;not null" json:"start_date"`
	EndDate     time.Time         `gorm:"type:date;not null" json:"end_date"`
	TotalBudget float64           `gorm:"type:numeric(18,2);not null;default:0" json:"total_budget"`
	Status      AssetBudgetStatus `gorm:"type:varchar(20);default:'draft';index" json:"status"`

	// Relations
	Categories []AssetBudgetCategory `gorm:"foreignKey:BudgetID;constraint:OnDelete:CASCADE" json:"categories,omitempty"`

	CreatedBy *string        `gorm:"type:uuid" json:"created_by"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AssetBudget) TableName() string {
	return "asset_budgets"
}

func (b *AssetBudget) BeforeCreate(tx *gorm.DB) error {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	return nil
}

type AssetBudgetCategory struct {
	ID              string  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	BudgetID        string  `gorm:"type:uuid;not null;index" json:"budget_id"`
	CategoryID      *string `gorm:"type:uuid;index" json:"category_id"` // Reference to AssetCategory (optional)
	CategoryName    string  `gorm:"type:varchar(150);not null" json:"category_name"`
	AllocatedAmount float64 `gorm:"type:numeric(18,2);not null;default:0" json:"allocated_amount"`
	UsedAmount      float64 `gorm:"type:numeric(18,2);not null;default:0" json:"used_amount"`
	CommittedAmount float64 `gorm:"type:numeric(18,2);not null;default:0" json:"committed_amount"` // PO created but not yet invoiced
	Notes           string  `gorm:"type:text" json:"notes"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AssetBudgetCategory) TableName() string {
	return "asset_budget_categories"
}

func (bc *AssetBudgetCategory) BeforeCreate(tx *gorm.DB) error {
	if bc.ID == "" {
		bc.ID = uuid.New().String()
	}
	return nil
}

// Calculated fields
func (bc *AssetBudgetCategory) AvailableAmount() float64 {
	return bc.AllocatedAmount - bc.UsedAmount - bc.CommittedAmount
}

func (b *AssetBudget) TotalUsed() float64 {
	total := 0.0
	for _, cat := range b.Categories {
		total += cat.UsedAmount
	}
	return total
}

func (b *AssetBudget) TotalCommitted() float64 {
	total := 0.0
	for _, cat := range b.Categories {
		total += cat.CommittedAmount
	}
	return total
}

func (b *AssetBudget) TotalAvailable() float64 {
	return b.TotalBudget - b.TotalUsed() - b.TotalCommitted()
}
