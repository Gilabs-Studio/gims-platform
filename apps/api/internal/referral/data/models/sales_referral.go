package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SalesReferralAccount struct {
	ID                     string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email                  string         `gorm:"type:varchar(255);not null;uniqueIndex" json:"email"`
	Name                   *string        `gorm:"type:varchar(255)" json:"name,omitempty"`
	IsActive               bool           `gorm:"type:boolean;not null;default:true;index" json:"is_active"`
	CloseCommissionBps     *int           `gorm:"type:int" json:"close_commission_bps,omitempty"`
	RecurringCommissionBps *int           `gorm:"type:int" json:"recurring_commission_bps,omitempty"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"`
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

type ReferralCommissionConfig struct {
	ID                            string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	DefaultCloseCommissionBps     int            `gorm:"type:int;not null" json:"default_close_commission_bps"`
	DefaultRecurringCommissionBps int            `gorm:"type:int;not null" json:"default_recurring_commission_bps"`
	IsActive                      bool           `gorm:"type:boolean;not null;default:true;index" json:"is_active"`
	CreatedAt                     time.Time      `json:"created_at"`
	UpdatedAt                     time.Time      `json:"updated_at"`
	DeletedAt                     gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ReferralCommissionConfig) TableName() string { return "referral_commission_configs" }

func (c *ReferralCommissionConfig) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

type ReferralCommissionStatus string

const (
	CommissionStatusPending  ReferralCommissionStatus = "pending"
	CommissionStatusApproved ReferralCommissionStatus = "approved"
	CommissionStatusPaid     ReferralCommissionStatus = "paid"
	CommissionStatusVoid     ReferralCommissionStatus = "void"
)

type ReferralCommissionType string

const (
	CommissionTypeClose      ReferralCommissionType = "close"
	CommissionTypeRecurring  ReferralCommissionType = "recurring"
	CommissionTypeAdjustment ReferralCommissionType = "adjustment"
)

type ReferralCommission struct {
	ID                        string                   `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SalesReferralAccountID    string                   `gorm:"type:uuid;not null;index" json:"sales_referral_account_id"`
	SalesReferralCodeID       string                   `gorm:"type:uuid;not null;index" json:"sales_referral_code_id"`
	SalesReferralConversionID *string                  `gorm:"type:uuid;index" json:"sales_referral_conversion_id,omitempty"`
	TenantID                  string                   `gorm:"type:uuid;not null;index" json:"tenant_id"`
	SubscriptionID            *string                  `gorm:"type:uuid;index" json:"subscription_id,omitempty"`
	PaymentTransactionID      string                   `gorm:"type:uuid;not null;index;uniqueIndex:idx_referral_commission_payment_type" json:"payment_transaction_id"`
	CommissionType            ReferralCommissionType   `gorm:"type:varchar(32);not null;index;uniqueIndex:idx_referral_commission_payment_type" json:"commission_type"`
	Status                    ReferralCommissionStatus `gorm:"type:varchar(32);not null;default:'pending';index" json:"status"`
	SourceNetAmountIDR        int64                    `gorm:"type:bigint;not null;default:0" json:"source_net_amount_idr"`
	CommissionBps             int                      `gorm:"type:int;not null" json:"commission_bps"`
	CommissionAmountIDR       int64                    `gorm:"type:bigint;not null;default:0" json:"commission_amount_idr"`
	PaidAdjustmentForID       *string                  `gorm:"type:uuid;index" json:"paid_adjustment_for_id,omitempty"`
	EarnedAt                  time.Time                `gorm:"type:timestamptz;not null" json:"earned_at"`
	ApprovedAt                *time.Time               `gorm:"type:timestamptz" json:"approved_at,omitempty"`
	ApprovedBy                *string                  `gorm:"type:uuid" json:"approved_by,omitempty"`
	VoidedAt                  *time.Time               `gorm:"type:timestamptz" json:"voided_at,omitempty"`
	VoidedBy                  *string                  `gorm:"type:uuid" json:"voided_by,omitempty"`
	VoidReason                *string                  `gorm:"type:text" json:"void_reason,omitempty"`
	CreatedAt                 time.Time                `json:"created_at"`
	UpdatedAt                 time.Time                `json:"updated_at"`
	DeletedAt                 gorm.DeletedAt           `gorm:"index" json:"-"`
}

func (ReferralCommission) TableName() string { return "referral_commissions" }
func (c *ReferralCommission) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

type ReferralCommissionPayout struct {
	ID                     string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	SalesReferralAccountID string         `gorm:"type:uuid;not null;index" json:"sales_referral_account_id"`
	Status                 string         `gorm:"type:varchar(32);not null;default:'paid';index" json:"status"`
	TotalAmountIDR         int64          `gorm:"type:bigint;not null;default:0" json:"total_amount_idr"`
	PaidAt                 time.Time      `gorm:"type:timestamptz;not null" json:"paid_at"`
	PaymentReference       *string        `gorm:"type:varchar(255)" json:"payment_reference,omitempty"`
	Notes                  *string        `gorm:"type:text" json:"notes,omitempty"`
	CreatedBy              *string        `gorm:"type:uuid" json:"created_by,omitempty"`
	CreatedAt              time.Time      `json:"created_at"`
	UpdatedAt              time.Time      `json:"updated_at"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ReferralCommissionPayout) TableName() string { return "referral_commission_payouts" }
func (p *ReferralCommissionPayout) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

type ReferralCommissionPayoutItem struct {
	ID                   string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	PayoutID             string         `gorm:"type:uuid;not null;index" json:"payout_id"`
	ReferralCommissionID string         `gorm:"type:uuid;not null;uniqueIndex" json:"referral_commission_id"`
	AmountIDR            int64          `gorm:"type:bigint;not null;default:0" json:"amount_idr"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

func (ReferralCommissionPayoutItem) TableName() string { return "referral_commission_payout_items" }
func (p *ReferralCommissionPayoutItem) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}
