package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AssetSparePartLink struct {
	ID               string          `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AssetID          string          `gorm:"type:uuid;not null;index" json:"asset_id"`
	Asset            *Asset          `gorm:"foreignKey:AssetID" json:"asset,omitempty"`
	SparePartID      string          `gorm:"type:uuid;not null;index" json:"spare_part_id"`
	SparePart        *AssetSparePart `gorm:"foreignKey:SparePartID" json:"spare_part,omitempty"`
	QuantityPerAsset int             `gorm:"default:1" json:"quantity_per_asset"`
	Notes            string          `gorm:"type:text" json:"notes"`

	CreatedAt time.Time `json:"created_at"`
}

func (AssetSparePartLink) TableName() string {
	return "asset_spare_part_links"
}

func (l *AssetSparePartLink) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}
