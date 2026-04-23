package repositories

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm"
)

// SubscriptionPlanRepository defines data-access operations for SubscriptionPlanConfig.
type SubscriptionPlanRepository interface {
	// ListActive returns all active plan configs, ordered by sort_order.
	ListActive(ctx context.Context) ([]*models.SubscriptionPlanConfig, error)
	// ListAll returns all plan configs (including inactive) for system admins.
	ListAll(ctx context.Context, page, perPage int) ([]*models.SubscriptionPlanConfig, int64, error)
	// FindBySlug returns a single plan config by its slug.
	FindBySlug(ctx context.Context, slug string) (*models.SubscriptionPlanConfig, error)
	// Upsert inserts or updates a plan config (keyed on slug).
	Upsert(ctx context.Context, plan *models.SubscriptionPlanConfig) error
	// SetActive toggles a plan's active state.
	SetActive(ctx context.Context, slug string, active bool) error
	// ListEntitlements returns all module entitlements for a given plan slug.
	ListEntitlements(ctx context.Context, planSlug string) ([]*models.PlanModuleEntitlement, error)
	// SyncEntitlements replaces all entitlements for a plan with the provided list.
	SyncEntitlements(ctx context.Context, planSlug string, modules []string) error
	// GetEnabledModules returns the set of enabled module slugs for a plan slug.
	GetEnabledModules(ctx context.Context, planSlug string) ([]string, error)
	// GetEnabledModulesForTenant looks up the tenant's active subscription plan and
	// returns the enabled module slugs for that plan. Falls back to empty slice on error.
	GetEnabledModulesForTenant(ctx context.Context, tenantID string) ([]string, error)
}

type subscriptionPlanRepository struct {
	db *gorm.DB
}

// NewSubscriptionPlanRepository creates a new SubscriptionPlanRepository.
func NewSubscriptionPlanRepository(db *gorm.DB) SubscriptionPlanRepository {
	return &subscriptionPlanRepository{db: db}
}

// getDB returns the db scoped to the context (respects transaction if present).
// Plan configs are platform-wide, so we bypass tenant scoping intentionally.
func (r *subscriptionPlanRepository) getDB(ctx context.Context) *gorm.DB {
	return database.GetDB(ctx, r.db)
}

func (r *subscriptionPlanRepository) ListActive(ctx context.Context) ([]*models.SubscriptionPlanConfig, error) {
	var plans []*models.SubscriptionPlanConfig
	err := r.getDB(ctx).
		Preload("Entitlements").
		Where("is_active = true AND deleted_at IS NULL").
		Order("sort_order ASC, name ASC").
		Find(&plans).Error
	return plans, err
}

func (r *subscriptionPlanRepository) ListAll(ctx context.Context, page, perPage int) ([]*models.SubscriptionPlanConfig, int64, error) {
	var plans []*models.SubscriptionPlanConfig
	var total int64

	q := r.getDB(ctx).Model(&models.SubscriptionPlanConfig{}).Where("deleted_at IS NULL")
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	err := q.Preload("Entitlements").
		Order("sort_order ASC, name ASC").
		Offset(offset).Limit(perPage).
		Find(&plans).Error
	return plans, total, err
}

func (r *subscriptionPlanRepository) FindBySlug(ctx context.Context, slug string) (*models.SubscriptionPlanConfig, error) {
	var plan models.SubscriptionPlanConfig
	err := r.getDB(ctx).
		Preload("Entitlements").
		Where("slug = ? AND deleted_at IS NULL", slug).
		First(&plan).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, err
	}
	return &plan, nil
}

func (r *subscriptionPlanRepository) Upsert(ctx context.Context, plan *models.SubscriptionPlanConfig) error {
	return r.getDB(ctx).
		Where(models.SubscriptionPlanConfig{Slug: plan.Slug}).
		Assign(*plan).
		FirstOrCreate(plan).Error
}

func (r *subscriptionPlanRepository) SetActive(ctx context.Context, slug string, active bool) error {
	return r.getDB(ctx).
		Model(&models.SubscriptionPlanConfig{}).
		Where("slug = ? AND deleted_at IS NULL", slug).
		Update("is_active", active).Error
}

func (r *subscriptionPlanRepository) ListEntitlements(ctx context.Context, planSlug string) ([]*models.PlanModuleEntitlement, error) {
	var entitlements []*models.PlanModuleEntitlement
	err := r.getDB(ctx).
		Where("plan_slug = ? AND is_enabled = true", planSlug).
		Find(&entitlements).Error
	return entitlements, err
}

// SyncEntitlements atomically replaces all enabled entitlements for a plan.
// Modules not in the list are soft-deleted (is_enabled = false).
func (r *subscriptionPlanRepository) SyncEntitlements(ctx context.Context, planSlug string, modules []string) error {
	db := r.getDB(ctx)

	// Disable all existing entitlements for this plan.
	if err := db.Model(&models.PlanModuleEntitlement{}).
		Where("plan_slug = ?", planSlug).
		Update("is_enabled", false).Error; err != nil {
		return err
	}

	// Re-enable or create each provided module.
	for _, mod := range modules {
		entitlement := models.PlanModuleEntitlement{
			PlanSlug:   planSlug,
			ModuleSlug: mod,
			IsEnabled:  true,
		}
		if err := db.Where(models.PlanModuleEntitlement{PlanSlug: planSlug, ModuleSlug: mod}).
			Assign(entitlement).
			FirstOrCreate(&entitlement).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *subscriptionPlanRepository) GetEnabledModules(ctx context.Context, planSlug string) ([]string, error) {
	entitlements, err := r.ListEntitlements(ctx, planSlug)
	if err != nil {
		return nil, err
	}
	modules := make([]string, 0, len(entitlements))
	for _, e := range entitlements {
		if e.IsEnabled {
			modules = append(modules, e.ModuleSlug)
		}
	}
	return modules, nil
}

// GetEnabledModulesForTenant resolves the tenant's active plan and returns enabled modules.
// Uses a direct DB query to avoid a separate repo dependency.
func (r *subscriptionPlanRepository) GetEnabledModulesForTenant(ctx context.Context, tenantID string) ([]string, error) {
	// Find the active plan slug for the tenant.
	var planSlug string
	err := r.db.WithContext(ctx).
		Table("tenant_subscriptions").
		Select("plan").
		Where("tenant_id = ? AND status IN ('active','trial') AND deleted_at IS NULL", tenantID).
		Order("created_at DESC").
		Limit(1).
		Row().Scan(&planSlug)
	if err != nil || planSlug == "" {
		// Tenant has no active subscription — grant no module access.
		return []string{}, nil
	}
	return r.GetEnabledModules(ctx, planSlug)
}
