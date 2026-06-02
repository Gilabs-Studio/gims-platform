package models

import (
	"time"

	"gorm.io/gorm"
)

type SupportFeedback struct {
	ID         string         `gorm:"type:uuid;primary_key" json:"id"`
	TenantID   string         `gorm:"column:tenant_id;type:uuid;index;not null" json:"tenant_id"`
	UserID     string         `gorm:"column:user_id;type:uuid;index;not null" json:"user_id"`
	UserName   string         `gorm:"type:varchar(255);not null" json:"user_name"`
	UserEmail  string         `gorm:"type:varchar(255);not null" json:"user_email"`
	TenantName string         `gorm:"type:varchar(255);not null" json:"tenant_name"`
	Message    string         `gorm:"type:text;not null" json:"message"`
	ImageURL   *string        `gorm:"type:text" json:"image_url,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (SupportFeedback) TableName() string {
	return "support_feedbacks"
}
