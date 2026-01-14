package models

import (
	"time"

	permissionModels "github.com/gilabs/crm-healthcare/api/internal/permission/data/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Role represents a role entity
type Role struct {
	ID          string                        `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Name        string                        `gorm:"type:varchar(100);uniqueIndex;not null" json:"name"`
	Code        string                        `gorm:"type:varchar(50);uniqueIndex;not null" json:"code"`
	Description string                        `gorm:"type:text" json:"description"`
	Status      string                        `gorm:"type:varchar(20);not null;default:'active'" json:"status"`
	IsProtected bool                          `gorm:"type:boolean;not null;default:false" json:"is_protected"` // Protected roles cannot be deleted or disabled
	Permissions []permissionModels.Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
	CreatedAt   time.Time                     `json:"created_at"`
	UpdatedAt   time.Time                     `gorm:"index" json:"updated_at"`
	DeletedAt   gorm.DeletedAt                `gorm:"index" json:"-"`
}

// TableName specifies the table name for Role
func (Role) TableName() string {
	return "roles"
}

// BeforeCreate hook to generate UUID
func (r *Role) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}
