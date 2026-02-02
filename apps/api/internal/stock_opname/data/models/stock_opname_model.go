package models

import (
	"time"

	warehouse "github.com/gilabs/gims/api/internal/warehouse/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StockOpnameStatus string

const (
	StockOpnameStatusDraft    StockOpnameStatus = "draft"
	StockOpnameStatusPending  StockOpnameStatus = "pending"
	StockOpnameStatusApproved StockOpnameStatus = "approved"
	StockOpnameStatusRejected StockOpnameStatus = "rejected"
	StockOpnameStatusPosted   StockOpnameStatus = "posted"
)

type StockOpname struct {
	ID               string            `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	OpnameNumber     string            `gorm:"type:varchar(50);uniqueIndex;not null"`
	WarehouseID      string            `gorm:"type:uuid;not null;index"`
	Date             time.Time         `gorm:"type:date;not null"`
	Status           StockOpnameStatus `gorm:"type:varchar(20);not null;default:'draft'"`
	Description      string            `gorm:"type:text"`
	TotalItems       int               `gorm:"type:int;default:0"`
	TotalVarianceQty float64           `gorm:"type:decimal(15,2);default:0"`

	// Audit
	CreatedBy *string   `gorm:"type:uuid"`
	UpdatedBy *string   `gorm:"type:uuid"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`

	// Relations
	Items []StockOpnameItem `gorm:"foreignKey:StockOpnameID;constraint:OnDelete:CASCADE"`
	
	// Associations (used for joins)
	Warehouse *warehouse.Warehouse `gorm:"foreignKey:WarehouseID;references:ID" json:"warehouse,omitempty"`
}

type StockOpnameItem struct {
	ID            string   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	StockOpnameID string   `gorm:"type:uuid;not null;index"`
	ProductID     string   `gorm:"type:uuid;not null;index"`
	SystemQty     float64  `gorm:"type:decimal(15,2);not null;default:0"`
	PhysicalQty   *float64 `gorm:"type:decimal(15,2)"` // Nullable until counted
	VarianceQty   float64  `gorm:"type:decimal(15,2);default:0"`
	Notes         string   `gorm:"type:text"`
    
    // Audit
    CreatedAt     time.Time `gorm:"autoCreateTime"`
    UpdatedAt     time.Time `gorm:"autoUpdateTime"`
}

func (StockOpname) TableName() string {
	return "stock_opnames"
}

func (StockOpnameItem) TableName() string {
	return "stock_opname_items"
}

// BeforeCreate hook to generate UUID
func (s *StockOpname) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook to generate UUID
func (s *StockOpnameItem) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}
