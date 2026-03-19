package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkOrderSparePart struct {
	ID           string          `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	WorkOrderID  string          `gorm:"type:uuid;not null;index" json:"work_order_id"`
	WorkOrder    *AssetWorkOrder `gorm:"foreignKey:WorkOrderID" json:"work_order,omitempty"`
	SparePartID  string          `gorm:"type:uuid;not null;index" json:"spare_part_id"`
	SparePart    *AssetSparePart `gorm:"foreignKey:SparePartID" json:"spare_part,omitempty"`
	QuantityUsed int             `gorm:"not null" json:"quantity_used"`
	UnitCost     float64         `gorm:"type:numeric(18,2);not null;default:0" json:"unit_cost"`
	TotalCost    float64         `gorm:"type:numeric(18,2);not null;default:0" json:"total_cost"`

	CreatedAt time.Time `json:"created_at"`
}

func (WorkOrderSparePart) TableName() string {
	return "work_order_spare_parts"
}

func (wsp *WorkOrderSparePart) BeforeCreate(tx *gorm.DB) error {
	if wsp.ID == "" {
		wsp.ID = uuid.New().String()
	}
	return nil
}

// CalculateTotal menghitung total cost berdasarkan quantity dan unit cost
func (wsp *WorkOrderSparePart) CalculateTotal() {
	wsp.TotalCost = float64(wsp.QuantityUsed) * wsp.UnitCost
}
