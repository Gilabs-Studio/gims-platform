package usecase

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/tenant/data/models"
	"github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/gilabs/gims/api/internal/tenant/domain/dto"
	"gorm.io/gorm"
)

var ErrSubscriptionNotFound = errors.New("subscription not found")

// SubscriptionUsecase handles tenant subscription queries for system admins.
type SubscriptionUsecase interface {
	ListAll(ctx context.Context, params dto.SubscriptionListParams) ([]*dto.SubscriptionResponse, *response.PaginationMeta, error)
	GetActiveByTenant(ctx context.Context, tenantID string) (*dto.SubscriptionResponse, error)
}

type subscriptionUsecase struct {
	subRepo    repositories.SubscriptionRepository
	tenantRepo repositories.TenantRepository
}

// NewSubscriptionUsecase creates a new SubscriptionUsecase.
func NewSubscriptionUsecase(
	subRepo repositories.SubscriptionRepository,
	tenantRepo repositories.TenantRepository,
) SubscriptionUsecase {
	return &subscriptionUsecase{
		subRepo:    subRepo,
		tenantRepo: tenantRepo,
	}
}

func (u *subscriptionUsecase) ListAll(ctx context.Context, params dto.SubscriptionListParams) ([]*dto.SubscriptionResponse, *response.PaginationMeta, error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PerPage <= 0 || params.PerPage > 100 {
		params.PerPage = 20
	}

	subs, total, err := u.subRepo.ListAll(ctx, params.Page, params.PerPage)
	if err != nil {
		return nil, nil, err
	}

	result := make([]*dto.SubscriptionResponse, 0, len(subs))
	for _, s := range subs {
		r := subModelToDTO(s)
		r.TenantName = u.resolveTenantName(ctx, s.TenantID)
		result = append(result, r)
	}

	pagination := response.NewPaginationMeta(params.Page, params.PerPage, int(total))
	return result, pagination, nil
}

func (u *subscriptionUsecase) GetActiveByTenant(ctx context.Context, tenantID string) (*dto.SubscriptionResponse, error) {
	sub, err := u.subRepo.FindActiveByTenantID(ctx, tenantID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrSubscriptionNotFound
		}
		return nil, err
	}
	r := subModelToDTO(sub)
	r.TenantName = u.resolveTenantName(ctx, tenantID)
	return r, nil
}

// resolveTenantName fetches a tenant name by ID (best-effort, returns empty on failure).
func (u *subscriptionUsecase) resolveTenantName(ctx context.Context, tenantID string) string {
	if tenantID == "" {
		return ""
	}
	tenants, _, _ := u.tenantRepo.FindPaginatedWithCounts(ctx, tenantID, 1, 1)
	if len(tenants) > 0 {
		return tenants[0].Name
	}
	return ""
}

// subModelToDTO converts a TenantSubscription model to its DTO representation.
func subModelToDTO(s *models.TenantSubscription) *dto.SubscriptionResponse {
	r := &dto.SubscriptionResponse{
		ID:            s.ID,
		TenantID:      s.TenantID,
		Plan:          string(s.Plan),
		BillingPeriod: string(s.BillingPeriod),
		Status:        string(s.Status),
		StartsAt:      s.StartsAt,
		ExpiresAt:     s.ExpiresAt,
		Notes:         s.Notes,
		CreatedAt:     s.CreatedAt,
	}
	if s.XenditPaymentID != nil {
		r.XenditPaymentID = *s.XenditPaymentID
	}
	if s.Coupon != nil {
		r.CouponCode = s.Coupon.Code
	}
	return r
}
