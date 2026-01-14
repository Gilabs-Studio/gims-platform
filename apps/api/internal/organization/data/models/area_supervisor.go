package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AreaSupervisor represents an area supervisor who manages one or more areas
type AreaSupervisor struct {
	ID        string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name      string         `gorm:"type:varchar(100);not null;index" json:"name"`
	Email     string         `gorm:"type:varchar(100)" json:"email"`
	Phone     string         `gorm:"type:varchar(20)" json:"phone"`
	IsActive  bool           `gorm:"default:true;index" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `gorm:"index" json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	// Many-to-many relationship with Areas
	Areas []AreaSupervisorArea `gorm:"foreignKey:AreaSupervisorID" json:"areas,omitempty"`
}

// TableName specifies the table name for AreaSupervisor
func (AreaSupervisor) TableName() string {
	return "area_supervisors"
}

// BeforeCreate hook to generate UUID
func (a *AreaSupervisor) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}
