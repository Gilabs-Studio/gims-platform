package dto

import "time"

type RegistrationCodeType string

const (
	RegistrationCodeTypeReferral RegistrationCodeType = "referral"
	RegistrationCodeTypeCoupon   RegistrationCodeType = "coupon"
)

type RegistrationCodeResponse struct {
	Valid                  bool                 `json:"valid"`
	Type                   RegistrationCodeType `json:"type,omitempty"`
	Reason                 string               `json:"reason,omitempty"`
	Code                   string               `json:"code,omitempty"`
	CouponCode             string               `json:"coupon_code,omitempty"`
	Description            string               `json:"description,omitempty"`
	CouponType             string               `json:"coupon_type,omitempty"`
	DiscountType           string               `json:"discount_type,omitempty"`
	DiscountValue          float64              `json:"discount_value,omitempty"`
	MaxUserCount           int                  `json:"max_user_count,omitempty"`
	LockUserCount          bool                 `json:"lock_user_count,omitempty"`
	PackagePriceMonthlyIDR float64              `json:"package_price_monthly_idr,omitempty"`
	PackagePriceYearlyIDR  float64              `json:"package_price_yearly_idr,omitempty"`
	Scope                  string               `json:"scope,omitempty"`
	TargetPlanSlug         string               `json:"target_plan_slug,omitempty"`
	DurationDays           int                  `json:"duration_days,omitempty"`
	ReferralCodeID         string               `json:"-"`
	SalesReferralAccountID string               `json:"-"`
	CouponID               string               `json:"-"`
}

type CreateSalesReferralAccountRequest struct {
	Email                  string  `json:"email"`
	Name                   *string `json:"name"`
	IsActive               *bool   `json:"is_active"`
	CloseCommissionBps     *int    `json:"close_commission_bps"`
	RecurringCommissionBps *int    `json:"recurring_commission_bps"`
}

type UpdateSalesReferralAccountRequest struct {
	Email                  string  `json:"email"`
	Name                   *string `json:"name"`
	IsActive               *bool   `json:"is_active"`
	CloseCommissionBps     *int    `json:"close_commission_bps"`
	RecurringCommissionBps *int    `json:"recurring_commission_bps"`
}

type SalesReferralAccountResponse struct {
	ID                     string    `json:"id"`
	Email                  string    `json:"email"`
	Name                   *string   `json:"name,omitempty"`
	IsActive               bool      `json:"is_active"`
	CloseCommissionBps     *int      `json:"close_commission_bps,omitempty"`
	RecurringCommissionBps *int      `json:"recurring_commission_bps,omitempty"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

type CreateSalesReferralCodeRequest struct {
	SalesReferralAccountID string     `json:"sales_referral_account_id"`
	CouponID               string     `json:"coupon_id"`
	Code                   string     `json:"code"`
	CampaignName           *string    `json:"campaign_name"`
	Description            *string    `json:"description"`
	IsActive               *bool      `json:"is_active"`
	MaxUses                int        `json:"max_uses"`
	MaxUsesPerEmail        int        `json:"max_uses_per_email"`
	ExpiresAt              *time.Time `json:"expires_at"`
}

type UpdateSalesReferralCodeRequest struct {
	SalesReferralAccountID string     `json:"sales_referral_account_id"`
	CouponID               string     `json:"coupon_id"`
	Code                   string     `json:"code"`
	CampaignName           *string    `json:"campaign_name"`
	Description            *string    `json:"description"`
	IsActive               *bool      `json:"is_active"`
	MaxUses                int        `json:"max_uses"`
	MaxUsesPerEmail        int        `json:"max_uses_per_email"`
	ExpiresAt              *time.Time `json:"expires_at"`
}

type SalesReferralCodeResponse struct {
	ID                     string                        `json:"id"`
	SalesReferralAccountID string                        `json:"sales_referral_account_id"`
	SalesReferralAccount   *SalesReferralAccountResponse `json:"sales_referral_account,omitempty"`
	CouponID               string                        `json:"coupon_id"`
	Code                   string                        `json:"code"`
	CampaignName           *string                       `json:"campaign_name,omitempty"`
	Description            *string                       `json:"description,omitempty"`
	IsActive               bool                          `json:"is_active"`
	MaxUses                int                           `json:"max_uses"`
	UsedCount              int                           `json:"used_count"`
	MaxUsesPerEmail        int                           `json:"max_uses_per_email"`
	ExpiresAt              *time.Time                    `json:"expires_at,omitempty"`
	CreatedAt              time.Time                     `json:"created_at"`
	UpdatedAt              time.Time                     `json:"updated_at"`
}

type SetReferralCodeStatusRequest struct {
	IsActive bool `json:"is_active"`
}

type ListParams struct {
	Page    int    `form:"page"`
	PerPage int    `form:"per_page"`
	Search  string `form:"search"`
}

type ReferralStatsParams struct {
	DateFrom               *time.Time `form:"date_from"`
	DateTo                 *time.Time `form:"date_to"`
	SalesReferralAccountID string     `form:"sales_referral_account_id"`
	ReferralCodeID         string     `form:"referral_code_id"`
}

type ReferralStatsResponse struct {
	TotalLeads       int64 `json:"total_leads"`
	TotalConversions int64 `json:"total_conversions"`
	TrialConversions int64 `json:"trial_conversions"`
	PaidConversions  int64 `json:"paid_conversions"`
	GrossRevenueIDR  int64 `json:"gross_revenue_idr"`
	NetRevenueIDR    int64 `json:"net_revenue_idr"`
}

type CommissionConfigRequest struct {
	DefaultCloseCommissionBps     int `json:"default_close_commission_bps"`
	DefaultRecurringCommissionBps int `json:"default_recurring_commission_bps"`
}

type CommissionConfigResponse struct {
	ID                            string    `json:"id"`
	DefaultCloseCommissionBps     int       `json:"default_close_commission_bps"`
	DefaultRecurringCommissionBps int       `json:"default_recurring_commission_bps"`
	IsActive                      bool      `json:"is_active"`
	CreatedAt                     time.Time `json:"created_at"`
	UpdatedAt                     time.Time `json:"updated_at"`
}

type CommissionListParams struct {
	Page                   int    `form:"page"`
	PerPage                int    `form:"per_page"`
	SalesReferralAccountID string `form:"sales_referral_account_id"`
	Status                 string `form:"status"`
	CommissionType         string `form:"commission_type"`
}

type CommissionResponse struct {
	ID                        string     `json:"id"`
	SalesReferralAccountID    string     `json:"sales_referral_account_id"`
	SalesReferralCodeID       string     `json:"sales_referral_code_id"`
	SalesReferralConversionID *string    `json:"sales_referral_conversion_id,omitempty"`
	TenantID                  string     `json:"tenant_id"`
	SubscriptionID            *string    `json:"subscription_id,omitempty"`
	PaymentTransactionID      string     `json:"payment_transaction_id"`
	CommissionType            string     `json:"commission_type"`
	Status                    string     `json:"status"`
	SourceNetAmountIDR        int64      `json:"source_net_amount_idr"`
	CommissionBps             int        `json:"commission_bps"`
	CommissionAmountIDR       int64      `json:"commission_amount_idr"`
	EarnedAt                  time.Time  `json:"earned_at"`
	ApprovedAt                *time.Time `json:"approved_at,omitempty"`
	VoidedAt                  *time.Time `json:"voided_at,omitempty"`
	VoidReason                *string    `json:"void_reason,omitempty"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
}

type VoidCommissionRequest struct {
	Reason string `json:"reason"`
}

type CreatePayoutRequest struct {
	SalesReferralAccountID string    `json:"sales_referral_account_id"`
	CommissionIDs          []string  `json:"commission_ids"`
	PaidAt                 time.Time `json:"paid_at"`
	PaymentReference       *string   `json:"payment_reference"`
	Notes                  *string   `json:"notes"`
}

type PayoutListParams struct {
	Page                   int    `form:"page"`
	PerPage                int    `form:"per_page"`
	SalesReferralAccountID string `form:"sales_referral_account_id"`
}

type PayoutResponse struct {
	ID                     string    `json:"id"`
	SalesReferralAccountID string    `json:"sales_referral_account_id"`
	Status                 string    `json:"status"`
	TotalAmountIDR         int64     `json:"total_amount_idr"`
	PaidAt                 time.Time `json:"paid_at"`
	PaymentReference       *string   `json:"payment_reference,omitempty"`
	Notes                  *string   `json:"notes,omitempty"`
	CreatedBy              *string   `json:"created_by,omitempty"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}
