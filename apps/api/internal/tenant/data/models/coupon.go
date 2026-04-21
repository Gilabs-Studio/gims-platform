package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CouponType represents the category of access a coupon grants.
type CouponType string

const (
	CouponTypeFullAccess CouponType = "full_access"
	CouponTypePOSOnly    CouponType = "pos_only"
	CouponTypeERPOnly    CouponType = "erp_only"
	CouponTypeCRMOnly    CouponType = "crm_only"
	CouponTypeHROnly     CouponType = "hr_only"
)

// Coupon represents a promotional code that grants subscription access without payment.
// Coupons are created exclusively by system admins.
type Coupon struct {
	ID           string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Code         string         `gorm:"type:varchar(64);uniqueIndex;not null"           json:"code"`
	Description  string         `gorm:"type:varchar(255);not null"                      json:"description"`
	CouponType   CouponType     `gorm:"type:varchar(50);not null;default:'full_access'" json:"coupon_type"`
	DurationDays int            `gorm:"type:int;not null;default:30"                   json:"duration_days"`
	MaxUses      int            `gorm:"type:int;not null;default:1"                    json:"max_uses"`
	UsedCount    int            `gorm:"type:int;not null;default:0"                    json:"used_count"`
	IsActive     bool           `gorm:"type:boolean;not null;default:true;index"       json:"is_active"`
	ExpiresAt    *time.Time     `gorm:"type:timestamptz"                               json:"expires_at"`
	CreatedBy    string         `gorm:"type:varchar(255);not null"                     json:"created_by"` // system admin email
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index"                                          json:"-"`
}

// TableName specifies the table name for Coupon.
func (Coupon) TableName() string {
	return "coupons"
}

// BeforeCreate hook to generate UUID.
func (c *Coupon) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// IsUsable returns true when the coupon can still be applied.
func (c *Coupon) IsUsable() bool {
	if !c.IsActive {
		return false
	}
	if c.UsedCount >= c.MaxUses {
		return false
	}
	if c.ExpiresAt != nil && time.Now().After(*c.ExpiresAt) {
		return false
	}
	return true
}

// CouponUsage records that a specific email has already redeemed a coupon.
// The composite unique index enforces one-time-per-email semantics.
type CouponUsage struct {
	ID        string    `gorm:"type:uuid;primary_key;default:gen_random_uuid()"               json:"id"`
	CouponID  string    `gorm:"type:uuid;not null;uniqueIndex:idx_coupon_email"               json:"coupon_id"`
	Email     string    `gorm:"type:varchar(255);not null;uniqueIndex:idx_coupon_email"       json:"email"`
	UsedAt    time.Time `gorm:"type:timestamptz;not null"                                     json:"used_at"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName specifies the table name for CouponUsage.
func (CouponUsage) TableName() string {
	return "coupon_usages"
}

// BeforeCreate hook to generate UUID.
func (cu *CouponUsage) BeforeCreate(tx *gorm.DB) error {
	if cu.ID == "" {
		cu.ID = uuid.New().String()
	}
	return nil
}
