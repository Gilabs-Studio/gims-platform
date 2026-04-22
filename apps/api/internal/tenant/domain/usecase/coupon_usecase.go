package usecase

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gilabs/gims/api/internal/core/apptime"
	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/tenant/data/models"
	"github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/gilabs/gims/api/internal/tenant/domain/dto"
	"gorm.io/gorm"
)

var (
	ErrCouponNotFound       = errors.New("coupon not found")
	ErrCouponInactive       = errors.New("coupon is inactive")
	ErrCouponExpired        = errors.New("coupon has expired")
	ErrCouponExhausted      = errors.New("coupon usage limit reached")
	ErrCouponDuplicate      = errors.New("coupon code already exists")
	ErrCouponAlreadyUsed    = errors.New("coupon already used by this email")
)

// CouponUsecase handles coupon management for system admins and validation during registration.
type CouponUsecase interface {
	Create(ctx context.Context, req *dto.CreateCouponRequest, adminEmail string) (*dto.CouponResponse, error)
	List(ctx context.Context, params dto.CouponListParams) ([]*dto.CouponResponse, *response.PaginationMeta, error)
	SetActive(ctx context.Context, id string, active bool) error
	// Validate checks whether a coupon code is usable (public, no email context).
	Validate(ctx context.Context, code string) (*dto.ValidateCouponResponse, error)
	// ValidateForEmail additionally checks if the given email has already used this coupon.
	ValidateForEmail(ctx context.Context, code, email string) (*dto.ValidateCouponResponse, error)
	// RedeemForTenant validates the coupon, records the email usage, and creates a TenantSubscription.
	RedeemForTenant(ctx context.Context, code, email, tenantID string) (*models.TenantSubscription, error)
}

type couponUsecase struct {
	couponRepo repositories.CouponRepository
	subRepo    repositories.SubscriptionRepository
	db         *gorm.DB
}

// NewCouponUsecase creates a new CouponUsecase.
func NewCouponUsecase(
	couponRepo repositories.CouponRepository,
	subRepo repositories.SubscriptionRepository,
	db *gorm.DB,
) CouponUsecase {
	return &couponUsecase{
		couponRepo: couponRepo,
		subRepo:    subRepo,
		db:         db,
	}
}

func (u *couponUsecase) Create(ctx context.Context, req *dto.CreateCouponRequest, adminEmail string) (*dto.CouponResponse, error) {
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		code = generateCouponCode()
	}

	coupon := &models.Coupon{
		Code:         code,
		Description:  req.Description,
		CouponType:   models.CouponType(req.CouponType),
		DurationDays: req.DurationDays,
		MaxUses:      req.MaxUses,
		IsActive:     true,
		ExpiresAt:    req.ExpiresAt,
		CreatedBy:    adminEmail,
	}

	if err := u.couponRepo.Create(ctx, coupon); err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return nil, ErrCouponDuplicate
		}
		return nil, err
	}

	return toCouponDTO(coupon), nil
}

func (u *couponUsecase) List(ctx context.Context, params dto.CouponListParams) ([]*dto.CouponResponse, *response.PaginationMeta, error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 20
	}

	coupons, total, err := u.couponRepo.List(ctx, params.ActiveOnly, params.Page, params.PerPage)
	if err != nil {
		return nil, nil, err
	}

	result := make([]*dto.CouponResponse, 0, len(coupons))
	for _, c := range coupons {
		result = append(result, toCouponDTO(c))
	}

	pagination := response.NewPaginationMeta(params.Page, params.PerPage, int(total))
	return result, pagination, nil
}

func (u *couponUsecase) SetActive(ctx context.Context, id string, active bool) error {
	_, err := u.couponRepo.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrCouponNotFound
		}
		return err
	}
	return u.couponRepo.SetActive(ctx, id, active)
}

func (u *couponUsecase) Validate(ctx context.Context, code string) (*dto.ValidateCouponResponse, error) {
	coupon, err := u.couponRepo.FindByCode(ctx, code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &dto.ValidateCouponResponse{Valid: false}, nil
		}
		return nil, err
	}

	if !coupon.IsUsable() {
		return &dto.ValidateCouponResponse{Valid: false}, nil
	}

	return &dto.ValidateCouponResponse{
		Valid:        true,
		Description:  coupon.Description,
		CouponType:   string(coupon.CouponType),
		DurationDays: coupon.DurationDays,
	}, nil
}

func (u *couponUsecase) ValidateForEmail(ctx context.Context, code, email string) (*dto.ValidateCouponResponse, error) {
	coupon, err := u.couponRepo.FindByCode(ctx, code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &dto.ValidateCouponResponse{Valid: false, Reason: "not_found"}, nil
		}
		return nil, err
	}

	if !coupon.IsUsable() {
		reason := "inactive"
		if coupon.ExpiresAt != nil && apptime.Now().After(*coupon.ExpiresAt) {
			reason = "expired"
		} else if coupon.UsedCount >= coupon.MaxUses {
			reason = "exhausted"
		}
		return &dto.ValidateCouponResponse{Valid: false, Reason: reason}, nil
	}

	if email != "" {
		used, err := u.couponRepo.IsEmailUsedCoupon(ctx, coupon.ID, email)
		if err != nil {
			return nil, err
		}
		if used {
			return &dto.ValidateCouponResponse{Valid: false, Reason: "already_used_by_email"}, nil
		}
	}

	return &dto.ValidateCouponResponse{
		Valid:        true,
		Description:  coupon.Description,
		CouponType:   string(coupon.CouponType),
		DurationDays: coupon.DurationDays,
	}, nil
}

// RedeemForTenant validates the coupon under a DB lock and creates a TenantSubscription.
// email is recorded in coupon_usages to enforce one-redemption-per-email.
func (u *couponUsecase) RedeemForTenant(ctx context.Context, code, email, tenantID string) (*models.TenantSubscription, error) {
	var sub *models.TenantSubscription

	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock the coupon row to prevent concurrent over-redemption.
		var coupon models.Coupon
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("code = ? AND deleted_at IS NULL", strings.ToUpper(strings.TrimSpace(code))).
			First(&coupon).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrCouponNotFound
			}
			return err
		}

		if !coupon.IsActive {
			return ErrCouponInactive
		}
		if coupon.UsedCount >= coupon.MaxUses {
			return ErrCouponExhausted
		}
		if coupon.ExpiresAt != nil && apptime.Now().After(*coupon.ExpiresAt) {
			return ErrCouponExpired
		}

		// Enforce one-time-per-email inside the transaction.
		var usageCount int64
		if err := tx.Model(&models.CouponUsage{}).
			Where("coupon_id = ? AND email = ?", coupon.ID, strings.ToLower(strings.TrimSpace(email))).
			Count(&usageCount).Error; err != nil {
			return err
		}
		if usageCount > 0 {
			return ErrCouponAlreadyUsed
		}

		// Record usage before incrementing to satisfy the unique constraint first.
		usage := &models.CouponUsage{
			CouponID: coupon.ID,
			Email:    strings.ToLower(strings.TrimSpace(email)),
			UsedAt:   apptime.Now(),
		}
		if err := tx.Create(usage).Error; err != nil {
			return err
		}

		// Atomically increment usage count.
		if err := tx.Model(&models.Coupon{}).Where("id = ?", coupon.ID).
			UpdateColumn("used_count", gorm.Expr("used_count + 1")).Error; err != nil {
			return err
		}

		now := apptime.Now()
		expiresAt := now.Add(time.Duration(coupon.DurationDays) * 24 * time.Hour)
		couponID := coupon.ID

		sub = &models.TenantSubscription{
			TenantID:      tenantID,
			Plan:          models.PlanFullAccess,
			BillingPeriod: models.BillingMonthly,
			Status:        models.SubscriptionTrial,
			StartsAt:      now,
			ExpiresAt:     &expiresAt,
			CouponID:      &couponID,
			Notes:         fmt.Sprintf("Granted via coupon %s (%s)", coupon.Code, coupon.Description),
		}

		return tx.Create(sub).Error
	})

	return sub, err
}

// ─── helpers ────────────────────────────────────────────────────────────────

// toCouponDTO converts a model to the safe response DTO.
func toCouponDTO(c *models.Coupon) *dto.CouponResponse {
	return &dto.CouponResponse{
		ID:           c.ID,
		Code:         c.Code,
		Description:  c.Description,
		CouponType:   string(c.CouponType),
		DurationDays: c.DurationDays,
		MaxUses:      c.MaxUses,
		UsedCount:    c.UsedCount,
		IsActive:     c.IsActive,
		ExpiresAt:    c.ExpiresAt,
		CreatedBy:    c.CreatedBy,
		CreatedAt:    c.CreatedAt,
		UpdatedAt:    c.UpdatedAt,
	}
}

// generateCouponCode produces a random 10-character uppercase alphanumeric code.
func generateCouponCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Omit I, O, 0, 1 for readability
	b := make([]byte, 10)
	if _, err := rand.Read(b); err != nil {
		// Fallback: use time-based suffix — should not happen in practice.
		return fmt.Sprintf("GIMS%d", time.Now().UnixNano()%100000)
	}
	result := make([]byte, 10)
	for i := range result {
		result[i] = charset[int(b[i])%len(charset)]
	}
	return string(result)
}
