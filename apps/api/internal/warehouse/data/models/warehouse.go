package models

import (
	"time"

	geographic "github.com/gilabs/crm-healthcare/api/internal/geographic/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Warehouse represents a warehouse/storage location entity
type Warehouse struct {
	ID          string              `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code        string              `gorm:"type:varchar(50);uniqueIndex" json:"code"`
	Name        string              `gorm:"type:varchar(200);not null;index" json:"name"`
	Description string              `gorm:"type:text" json:"description"`
	Capacity    *int                `gorm:"type:integer" json:"capacity"`
	Address     string              `gorm:"type:text" json:"address"`
	VillageID   *string             `gorm:"type:uuid;index" json:"village_id"`
	Village     *geographic.Village `gorm:"foreignKey:VillageID" json:"village,omitempty"`
	// Location coordinates
	Latitude  *float64       `gorm:"type:decimal(10,8)" json:"latitude"`
	Longitude *float64       `gorm:"type:decimal(11,8)" json:"longitude"`
	IsActive  bool           `gorm:"default:true;index" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Warehouse
func (Warehouse) TableName() string {
	return "warehouses"
}

// BeforeCreate hook to generate UUID
func (w *Warehouse) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return nil
}
