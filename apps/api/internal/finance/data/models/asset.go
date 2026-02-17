package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AssetStatus string

const (
	AssetStatusActive   AssetStatus = "active"
	AssetStatusDisposed AssetStatus = "disposed"
)

type Asset struct {
	ID string `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`

	Code string `gorm:"type:varchar(50);not null;uniqueIndex" json:"code"`
	Name string `gorm:"type:varchar(200);not null;index" json:"name"`

	CategoryID string         `gorm:"type:uuid;not null;index" json:"category_id"`
	Category   *AssetCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`

	LocationID string        `gorm:"type:uuid;not null;index" json:"location_id"`
	Location   *AssetLocation `gorm:"foreignKey:LocationID" json:"location,omitempty"`

	AcquisitionDate time.Time `gorm:"type:date;not null;index" json:"acquisition_date"`
	AcquisitionCost float64   `gorm:"type:numeric(18,2);not null" json:"acquisition_cost"`
	SalvageValue    float64   `gorm:"type:numeric(18,2);default:0" json:"salvage_value"`

	AccumulatedDepreciation float64 `gorm:"type:numeric(18,2);default:0" json:"accumulated_depreciation"`
	BookValue               float64 `gorm:"type:numeric(18,2);default:0" json:"book_value"`

	Status     AssetStatus `gorm:"type:varchar(20);default:'active';index" json:"status"`
	DisposedAt *time.Time  `json:"disposed_at"`

	CreatedBy *string `gorm:"type:uuid" json:"created_by"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	Depreciations []AssetDepreciation `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"depreciations,omitempty"`
	Transactions  []AssetTransaction  `gorm:"foreignKey:AssetID;constraint:OnDelete:CASCADE" json:"transactions,omitempty"`
}

func (Asset) TableName() string {
	return "assets"
}

func (a *Asset) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	if a.BookValue == 0 {
		a.BookValue = a.AcquisitionCost
	}
	return nil
}
