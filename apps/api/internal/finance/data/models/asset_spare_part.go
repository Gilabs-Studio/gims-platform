package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AssetSparePart struct {
	ID             string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PartNumber     string    `gorm:"type:varchar(50);not null;uniqueIndex" json:"part_number"`
	PartName       string    `gorm:"type:varchar(255);not null" json:"part_name"`
	Description    string    `gorm:"type:text" json:"description"`
	CategoryID     *string   `gorm:"type:uuid;index" json:"category_id"`
	UnitOfMeasure  string    `gorm:"type:varchar(20)" json:"unit_of_measure"`
	MinStockLevel  int       `gorm:"default:0" json:"min_stock_level"`
	MaxStockLevel  *int      `json:"max_stock_level"`
	ReorderPoint   int       `gorm:"default:0" json:"reorder_point"`
	CurrentStock   int       `gorm:"default:0" json:"current_stock"`
	UnitCost       float64   `gorm:"type:numeric(18,2);default:0" json:"unit_cost"`
	SupplierID     *string   `gorm:"type:uuid;index" json:"supplier_id"`
	Location       string    `gorm:"type:varchar(255)" json:"location"`
	IsActive       bool      `gorm:"default:true" json:"is_active"`

	AssetLinks []AssetSparePartLink `gorm:"foreignKey:SparePartID;constraint:OnDelete:CASCADE" json:"asset_links,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (AssetSparePart) TableName() string {
	return "asset_spare_parts"
}

func (sp *AssetSparePart) BeforeCreate(tx *gorm.DB) error {
	if sp.ID == "" {
		sp.ID = uuid.New().String()
	}
	return nil
}

// IsLowStock mengecek apakah stock dibawah reorder point
func (sp *AssetSparePart) IsLowStock() bool {
	return sp.CurrentStock <= sp.ReorderPoint
}

// IsOutOfStock mengecek apakah stock habis
func (sp *AssetSparePart) IsOutOfStock() bool {
	return sp.CurrentStock <= 0
}

// StockValue menghitung nilai inventory spare part
func (sp *AssetSparePart) StockValue() float64 {
	return float64(sp.CurrentStock) * sp.UnitCost
}

// CanFulfill mengecek apakah stock mencukupi untuk quantity yang diminta
func (sp *AssetSparePart) CanFulfill(quantity int) bool {
	return sp.CurrentStock >= quantity
}

// Reserve mengurangi stock untuk work order
func (sp *AssetSparePart) Reserve(quantity int) bool {
	if !sp.CanFulfill(quantity) {
		return false
	}
	sp.CurrentStock -= quantity
	return true
}

// Restock menambah stock
func (sp *AssetSparePart) Restock(quantity int) {
	sp.CurrentStock += quantity
}
