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
	Email    string  `json:"email" binding:"required,email"`
	Name     *string `json:"name" binding:"omitempty,max=255"`
	IsActive *bool   `json:"is_active"`
}

type UpdateSalesReferralAccountRequest struct {
	Email    string  `json:"email" binding:"required,email"`
	Name     *string `json:"name" binding:"omitempty,max=255"`
	IsActive bool    `json:"is_active"`
}

type SalesReferralAccountResponse struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      *string   `json:"name,omitempty"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateSalesReferralCodeRequest struct {
	SalesReferralAccountID string     `json:"sales_referral_account_id" binding:"required,uuid"`
	CouponID               string     `json:"coupon_id" binding:"required,uuid"`
	Code                   string     `json:"code" binding:"required,min=4,max=64"`
	CampaignName           *string    `json:"campaign_name" binding:"omitempty,max=255"`
	Description            *string    `json:"description" binding:"omitempty,max=2000"`
	IsActive               *bool      `json:"is_active"`
	MaxUses                int        `json:"max_uses" binding:"required,min=1"`
	MaxUsesPerEmail        int        `json:"max_uses_per_email" binding:"omitempty,min=1"`
	ExpiresAt              *time.Time `json:"expires_at"`
}

type UpdateSalesReferralCodeRequest struct {
	SalesReferralAccountID string     `json:"sales_referral_account_id" binding:"required,uuid"`
	CouponID               string     `json:"coupon_id" binding:"required,uuid"`
	Code                   string     `json:"code" binding:"required,min=4,max=64"`
	CampaignName           *string    `json:"campaign_name" binding:"omitempty,max=255"`
	Description            *string    `json:"description" binding:"omitempty,max=2000"`
	IsActive               bool       `json:"is_active"`
	MaxUses                int        `json:"max_uses" binding:"required,min=1"`
	MaxUsesPerEmail        int        `json:"max_uses_per_email" binding:"omitempty,min=1"`
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
