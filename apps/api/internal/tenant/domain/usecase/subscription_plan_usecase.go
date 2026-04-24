package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/gilabs/gims/api/internal/core/response"
	"github.com/gilabs/gims/api/internal/tenant/data/models"
	"github.com/gilabs/gims/api/internal/tenant/data/repositories"
	"github.com/gilabs/gims/api/internal/tenant/domain/dto"
	tenantPolicy "github.com/gilabs/gims/api/internal/tenant/domain/policy"
	"gorm.io/gorm"
)

var ErrPlanNotFound = errors.New("subscription plan not found")

// SubscriptionPlanUsecase manages plan configs and exposes the public pricing catalogue.
type SubscriptionPlanUsecase interface {
	// ListPublic returns all active plans for the public registration form.
	ListPublic(ctx context.Context) ([]*dto.SubscriptionPlanResponse, error)
	// ListAll returns all plans (incl. inactive) for system admins.
	ListAll(ctx context.Context, page, perPage int) ([]*dto.SubscriptionPlanResponse, *response.PaginationMeta, error)
	// GetBySlug returns a single plan config by slug (used during checkout to compute price).
	GetBySlug(ctx context.Context, slug string) (*dto.SubscriptionPlanResponse, error)
	// Upsert creates or updates a plan config.
	Upsert(ctx context.Context, req *dto.UpsertPlanRequest) (*dto.SubscriptionPlanResponse, error)
	// SetActive toggles plan active state.
	SetActive(ctx context.Context, slug string, active bool) error
	// SyncEntitlements replaces the module entitlement list for a plan.
	SyncEntitlements(ctx context.Context, slug string, modules []string) error
	// SyncMenuEntitlements replaces the menu entitlement list for a plan.
	SyncMenuEntitlements(ctx context.Context, slug string, menuURLs []string) error
	// ComputePrice returns the invoice amount for a plan/billing/usercount combination.
	ComputePrice(ctx context.Context, slug, billingPeriod string, userCount int) (int64, error)
}

type subscriptionPlanUsecase struct {
	planRepo repositories.SubscriptionPlanRepository
}

var posGrowthBroadParentMenuURLs = map[string]struct{}{
	"/sales":    {},
	"/purchase": {},
	"/stock":    {},
	"/finance":  {},
}

// NewSubscriptionPlanUsecase creates a new SubscriptionPlanUsecase.
func NewSubscriptionPlanUsecase(planRepo repositories.SubscriptionPlanRepository) SubscriptionPlanUsecase {
	return &subscriptionPlanUsecase{planRepo: planRepo}
}

func (u *subscriptionPlanUsecase) ListPublic(ctx context.Context) ([]*dto.SubscriptionPlanResponse, error) {
	plans, err := u.planRepo.ListActive(ctx)
	if err != nil {
		return nil, err
	}
	result := make([]*dto.SubscriptionPlanResponse, 0, len(plans))
	for _, p := range plans {
		result = append(result, planModelToDTO(p))
	}
	return result, nil
}

func (u *subscriptionPlanUsecase) ListAll(ctx context.Context, page, perPage int) ([]*dto.SubscriptionPlanResponse, *response.PaginationMeta, error) {
	if page <= 0 {
		page = 1
	}
	if perPage <= 0 || perPage > 100 {
		perPage = 20
	}
	plans, total, err := u.planRepo.ListAll(ctx, page, perPage)
	if err != nil {
		return nil, nil, err
	}
	result := make([]*dto.SubscriptionPlanResponse, 0, len(plans))
	for _, p := range plans {
		result = append(result, planModelToDTO(p))
	}
	meta := response.NewPaginationMeta(page, perPage, int(total))
	return result, meta, nil
}

func (u *subscriptionPlanUsecase) GetBySlug(ctx context.Context, slug string) (*dto.SubscriptionPlanResponse, error) {
	plan, err := u.planRepo.FindBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPlanNotFound
		}
		return nil, err
	}
	return planModelToDTO(plan), nil
}

func (u *subscriptionPlanUsecase) Upsert(ctx context.Context, req *dto.UpsertPlanRequest) (*dto.SubscriptionPlanResponse, error) {
	plan := &models.SubscriptionPlanConfig{
		Slug:            req.Slug,
		Name:            req.Name,
		Category:        req.Category,
		Description:     req.Description,
		BillingType:     models.BillingType(req.BillingType),
		PriceMonthlyIDR: req.PriceMonthlyIDR,
		PriceYearlyIDR:  req.PriceYearlyIDR,
		MinUsers:        req.MinUsers,
		MaxUsers:        req.MaxUsers,
		IsHighlighted:   req.IsHighlighted,
		SortOrder:       req.SortOrder,
		Features:        models.PlanFeatureList(req.Features),
		IsActive:        true,
	}
	if plan.MinUsers < 1 {
		plan.MinUsers = 1
	}
	if plan.MaxUsers < plan.MinUsers {
		plan.MaxUsers = 500
	}
	if err := u.planRepo.Upsert(ctx, plan); err != nil {
		return nil, err
	}
	if req.MenuURLs != nil {
		normalizedMenuURLs := sanitizeMenuURLsForPlan(plan.Slug, req.MenuURLs)
		if err := u.planRepo.SyncMenuEntitlements(ctx, plan.Slug, normalizedMenuURLs); err != nil {
			return nil, err
		}
		derivedModules := repositories.DeriveModulesFromMenuURLs(normalizedMenuURLs)
		if err := u.planRepo.SyncEntitlements(ctx, plan.Slug, derivedModules); err != nil {
			return nil, err
		}
	} else if req.Modules != nil {
		if err := u.planRepo.SyncEntitlements(ctx, plan.Slug, req.Modules); err != nil {
			return nil, err
		}
	}
	return u.GetBySlug(ctx, plan.Slug)
}

func (u *subscriptionPlanUsecase) SetActive(ctx context.Context, slug string, active bool) error {
	return u.planRepo.SetActive(ctx, slug, active)
}

func (u *subscriptionPlanUsecase) SyncEntitlements(ctx context.Context, slug string, modules []string) error {
	return u.planRepo.SyncEntitlements(ctx, slug, modules)
}

func (u *subscriptionPlanUsecase) SyncMenuEntitlements(ctx context.Context, slug string, menuURLs []string) error {
	normalizedMenuURLs := sanitizeMenuURLsForPlan(slug, menuURLs)
	if err := u.planRepo.SyncMenuEntitlements(ctx, slug, normalizedMenuURLs); err != nil {
		return err
	}
	return u.planRepo.SyncEntitlements(ctx, slug, repositories.DeriveModulesFromMenuURLs(normalizedMenuURLs))
}

func (u *subscriptionPlanUsecase) ComputePrice(ctx context.Context, slug, billingPeriod string, userCount int) (int64, error) {
	plan, err := u.planRepo.FindBySlug(ctx, slug)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, ErrPlanNotFound
		}
		return 0, err
	}
	return plan.TotalPriceIDR(billingPeriod, userCount), nil
}

// planModelToDTO converts a SubscriptionPlanConfig model to its DTO.
func planModelToDTO(p *models.SubscriptionPlanConfig) *dto.SubscriptionPlanResponse {
	modules := make([]string, 0, len(p.Entitlements))
	moduleSeen := make(map[string]struct{}, len(p.Entitlements))
	for _, e := range p.Entitlements {
		if e.IsEnabled {
			moduleSlug := strings.ToLower(strings.TrimSpace(e.ModuleSlug))
			if _, exists := moduleSeen[moduleSlug]; exists {
				continue
			}
			moduleSeen[moduleSlug] = struct{}{}
			modules = append(modules, moduleSlug)
		}
	}
	menuURLs := make([]string, 0, len(p.PermissionEntitlements))
	menuSeen := make(map[string]struct{}, len(p.PermissionEntitlements))
	for _, entitlement := range p.PermissionEntitlements {
		if !entitlement.IsEnabled || strings.TrimSpace(entitlement.MenuURL) == "" {
			continue
		}
		menuURL := strings.ToLower(strings.TrimSpace(entitlement.MenuURL))
		if _, exists := menuSeen[menuURL]; exists {
			continue
		}
		menuSeen[menuURL] = struct{}{}
		menuURLs = append(menuURLs, menuURL)
	}
	menuURLs = sanitizeMenuURLsForPlan(p.Slug, menuURLs)
	if len(modules) == 0 {
		modules = repositories.DeriveModulesFromMenuURLs(menuURLs)
	}
	return &dto.SubscriptionPlanResponse{
		Slug:            p.Slug,
		Name:            p.Name,
		Category:        p.Category,
		Description:     p.Description,
		BillingType:     string(p.BillingType),
		PriceMonthlyIDR: p.PriceMonthlyIDR,
		PriceYearlyIDR:  p.PriceYearlyIDR,
		MinUsers:        p.MinUsers,
		MaxUsers:        p.MaxUsers,
		IsActive:        p.IsActive,
		IsHighlighted:   p.IsHighlighted,
		SortOrder:       p.SortOrder,
		Features:        []string(p.Features),
		Modules:         modules,
		MenuURLs:        menuURLs,
	}
}

func sanitizeMenuURLsForPlan(planSlug string, menuURLs []string) []string {
	normalizedPlanSlug := tenantPolicy.NormalizePlanSlug(planSlug)
	if normalizedPlanSlug != "pos_growth" {
		return menuURLs
	}

	result := make([]string, 0, len(menuURLs))
	for _, rawMenuURL := range menuURLs {
		menuURL := strings.ToLower(strings.TrimSpace(rawMenuURL))
		if menuURL == "" {
			continue
		}
		if _, blocked := posGrowthBroadParentMenuURLs[menuURL]; blocked {
			continue
		}
		result = append(result, menuURL)
	}

	return result
}
