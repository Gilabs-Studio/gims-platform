package models

import (
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ConsentLog struct {
	ID          string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID      string    `gorm:"type:uuid;not null;index" json:"user_id"`
	ConsentType string    `gorm:"type:varchar(50);not null;index" json:"consent_type"` // tos, marketing, cookie
	Version     string    `gorm:"type:varchar(50);not null" json:"version"`            // e.g. tos-2026-05
	GrantedAt   time.Time `gorm:"type:timestamptz;not null" json:"granted_at"`
	IPAddress   string    `gorm:"type:varchar(45)" json:"ip_address"`
	UserAgent   string    `gorm:"type:text" json:"user_agent"`
}

func (ConsentLog) TableName() string {
	return "consent_logs"
}

func (c *ConsentLog) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	if c.GrantedAt.IsZero() {
		c.GrantedAt = apptime.Now()
	}
	return nil
}
