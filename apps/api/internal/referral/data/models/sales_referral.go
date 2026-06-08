package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SalesReferralAccount struct {
	ID        string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email     string         `gorm:"type:varchar(255);not null;uniqueIndex" json:"email"`
	Name      *string        `gorm:"type:varchar(255)" json:"name,omitempty"`
	IsActive  bool           `gorm:"type:boolean;not null;default:true;index" json:"is_active"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (SalesReferralAccount) TableName() string { return "sales_referral_accounts" }

func (a *SalesReferralAccount) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

type SalesReferralCode struct {
	ID                     string                `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SalesReferralAccountID string                `gorm:"type:uuid;not null;index" json:"sales_referral_account_id"`
	SalesReferralAccount   *SalesReferralAccount `gorm:"foreignKey:SalesReferralAccountID" json:"sales_referral_account,omitempty"`
	CouponID               string                `gorm:"type:uuid;not null;index" json:"coupon_id"`
	Code                   string                `gorm:"type:varchar(64);not null;uniqueIndex" json:"code"`
	CampaignName           *string               `gorm:"type:varchar(255)" json:"campaign_name,omitempty"`
	Description            *string               `gorm:"type:text" json:"description,omitempty"`
	IsActive               bool                  `gorm:"type:boolean;not null;default:true;index" json:"is_active"`
	MaxUses                int                   `gorm:"type:int;not null;default:1" json:"max_uses"`
	UsedCount              int                   `gorm:"type:int;not null;default:0" json:"used_count"`
	MaxUsesPerEmail        int                   `gorm:"type:int;not null;default:1" json:"max_uses_per_email"`
	ExpiresAt              *time.Time            `gorm:"type:timestamptz" json:"expires_at,omitempty"`
	CreatedAt              time.Time             `json:"created_at"`
	UpdatedAt              time.Time             `json:"updated_at"`
	DeletedAt              gorm.DeletedAt        `gorm:"index" json:"-"`
}

func (SalesReferralCode) TableName() string { return "sales_referral_codes" }

func (c *SalesReferralCode) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

type SalesReferralLeadStatus string

const (
	LeadStatusPendingPayment SalesReferralLeadStatus = "pending_payment"
	LeadStatusConverted      SalesReferralLeadStatus = "converted"
	LeadStatusFailed         SalesReferralLeadStatus = "failed"
	LeadStatusExpired        SalesReferralLeadStatus = "expired"
	LeadStatusSuperseded     SalesReferralLeadStatus = "superseded"
)

type SalesReferralLead struct {
	ID                     string                  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SalesReferralCodeID    string                  `gorm:"type:uuid;not null;index" json:"sales_referral_code_id"`
	SalesReferralAccountID string                  `gorm:"type:uuid;not null;index" json:"sales_referral_account_id"`
	CouponID               string                  `gorm:"type:uuid;not null;index" json:"coupon_id"`
	EmailNormalized        string                  `gorm:"type:varchar(255);not null;index" json:"email_normalized"`
	RegistrationCode       string                  `gorm:"type:varchar(64);not null" json:"registration_code"`
	Status                 SalesReferralLeadStatus `gorm:"type:varchar(32);not null;default:'pending_payment';index" json:"status"`
	GrossAmountIDR         int64                   `gorm:"type:bigint;not null;default:0" json:"gross_amount_idr"`
	NetAmountIDR           int64                   `gorm:"type:bigint;not null;default:0" json:"net_amount_idr"`
	PendingRegistrationKey *string                 `gorm:"type:varchar(128)" json:"pending_registration_key,omitempty"`
	SupersededByID         *string                 `gorm:"type:uuid" json:"superseded_by_id,omitempty"`
	CreatedAt              time.Time               `json:"created_at"`
	UpdatedAt              time.Time               `json:"updated_at"`
	DeletedAt              gorm.DeletedAt          `gorm:"index" json:"-"`
}

func (SalesReferralLead) TableName() string { return "sales_referral_leads" }

func (l *SalesReferralLead) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = uuid.New().String()
	}
	return nil
}

type SalesReferralConversionType string

const (
	ConversionTypeTrial            SalesReferralConversionType = "trial"
	ConversionTypePaid             SalesReferralConversionType = "paid"
	ConversionTypeFirstPaidUpgrade SalesReferralConversionType = "first_paid_upgrade"
)

type SalesReferralConversion struct {
	ID                     string                      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SalesReferralLeadID    string                      `gorm:"type:uuid;not null;index" json:"sales_referral_lead_id"`
	SalesReferralCodeID    string                      `gorm:"type:uuid;not null;index;uniqueIndex:idx_referral_conversion_code_tenant" json:"sales_referral_code_id"`
	SalesReferralAccountID string                      `gorm:"type:uuid;not null;index" json:"sales_referral_account_id"`
	CouponID               string                      `gorm:"type:uuid;not null;index" json:"coupon_id"`
	TenantID               string                      `gorm:"type:uuid;not null;index;uniqueIndex:idx_referral_conversion_code_tenant" json:"tenant_id"`
	SubscriptionID         *string                     `gorm:"type:uuid" json:"subscription_id,omitempty"`
	ConversionType         SalesReferralConversionType `gorm:"type:varchar(32);not null;index" json:"conversion_type"`
	GrossAmountIDR         int64                       `gorm:"type:bigint;not null;default:0" json:"gross_amount_idr"`
	NetAmountIDR           int64                       `gorm:"type:bigint;not null;default:0" json:"net_amount_idr"`
	CreatedAt              time.Time                   `json:"created_at"`
	UpdatedAt              time.Time                   `json:"updated_at"`
	DeletedAt              gorm.DeletedAt              `gorm:"index" json:"-"`
}

func (SalesReferralConversion) TableName() string { return "sales_referral_conversions" }

func (c *SalesReferralConversion) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}
