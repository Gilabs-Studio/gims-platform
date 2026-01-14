package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AreaSupervisorArea represents the many-to-many relationship between AreaSupervisor and Area
type AreaSupervisorArea struct {
	ID               string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	AreaSupervisorID string    `gorm:"type:uuid;not null;index" json:"area_supervisor_id"`
	AreaID           string    `gorm:"type:uuid;not null;index" json:"area_id"`
	CreatedAt        time.Time `json:"created_at"`
	// Relations
	AreaSupervisor *AreaSupervisor `gorm:"foreignKey:AreaSupervisorID" json:"area_supervisor,omitempty"`
	Area           *Area           `gorm:"foreignKey:AreaID" json:"area,omitempty"`
}

// TableName specifies the table name for AreaSupervisorArea
func (AreaSupervisorArea) TableName() string {
	return "area_supervisor_areas"
}

// BeforeCreate hook to generate UUID
func (a *AreaSupervisorArea) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}
