package dto

import "time"

// ─── Coupon DTOs ─────────────────────────────────────────────────────────────

// CreateCouponRequest is the system-admin payload for generating a new coupon.
type CreateCouponRequest struct {
	// Code must be uppercase alphanumeric, 6-32 chars. Leave empty to auto-generate.
	Code        string `json:"code"         binding:"omitempty,min=4,max=32,alphanum"`
	Description string `json:"description"  binding:"required,min=5,max=255"`
	CouponType  string `json:"coupon_type"  binding:"required,oneof=full_access pos_only erp_only crm_only hr_only"`
	// DurationDays is how many days access is granted. Minimum 1.
	DurationDays int        `json:"duration_days" binding:"required,min=1,max=3650"`
	MaxUses      int        `json:"max_uses"      binding:"required,min=1,max=100000"`
	ExpiresAt    *time.Time `json:"expires_at"    binding:"omitempty"`
}

// CouponResponse is the safe representation of a coupon returned to system admins.
type CouponResponse struct {
	ID           string     `json:"id"`
	Code         string     `json:"code"`
	Description  string     `json:"description"`
	CouponType   string     `json:"coupon_type"`
	DurationDays int        `json:"duration_days"`
	MaxUses      int        `json:"max_uses"`
	UsedCount    int        `json:"used_count"`
	IsActive     bool       `json:"is_active"`
	ExpiresAt    *time.Time `json:"expires_at"`
	CreatedBy    string     `json:"created_by"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// SetCouponStatusRequest toggles a coupon active/inactive.
type SetCouponStatusRequest struct {
	IsActive bool `json:"is_active"`
}

// CouponListParams query parameters for listing coupons.
type CouponListParams struct {
	Page       int  `form:"page"`
	PerPage    int  `form:"per_page"`
	ActiveOnly bool `form:"active_only"`
}

// ValidateCouponRequest is used during tenant registration to check a coupon code.
type ValidateCouponRequest struct {
	Code string `json:"code" binding:"required,min=1,max=64"`
}

// ValidateCouponResponse is returned to the registration client before they commit.
type ValidateCouponResponse struct {
	Valid        bool   `json:"valid"`
	// Reason is a machine-readable code for why the coupon is invalid (empty when valid).
	// Values: "not_found", "inactive", "expired", "exhausted", "already_used_by_email"
	Reason       string `json:"reason,omitempty"`
	Description  string `json:"description,omitempty"`
	CouponType   string `json:"coupon_type,omitempty"`
	DurationDays int    `json:"duration_days,omitempty"`
}

// ─── Subscription DTOs ───────────────────────────────────────────────────────

// SubscriptionResponse is the representation of a tenant subscription.
type SubscriptionResponse struct {
	ID              string     `json:"id"`
	TenantID        string     `json:"tenant_id"`
	TenantName      string     `json:"tenant_name,omitempty"`
	Plan            string     `json:"plan"`
	BillingPeriod   string     `json:"billing_period"`
	Status          string     `json:"status"`
	StartsAt        time.Time  `json:"starts_at"`
	ExpiresAt       *time.Time `json:"expires_at"`
	CouponCode      string     `json:"coupon_code,omitempty"`
	XenditPaymentID string     `json:"xendit_payment_id,omitempty"`
	Notes           string     `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// SubscriptionListParams query parameters for listing subscriptions.
type SubscriptionListParams struct {
	Page    int `form:"page"`
	PerPage int `form:"per_page"`
}
