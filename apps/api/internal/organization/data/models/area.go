package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Area represents a geographical/sales area
type Area struct {
	ID          string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string         `gorm:"type:varchar(100);not null;uniqueIndex" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	IsActive    bool           `gorm:"default:true;index" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName specifies the table name for Area
func (Area) TableName() string {
	return "areas"
}

// BeforeCreate hook to generate UUID
func (a *Area) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}
