package repositories

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/middleware"
	generalModels "github.com/gilabs/gims/api/internal/general/data/models"
	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"
)

// OnboardingRepository manages tenant onboarding state persistence.
type OnboardingRepository interface {
	Get(ctx context.Context) (*generalModels.TenantOnboarding, error)
	Save(ctx context.Context, state *generalModels.TenantOnboarding) error
	CheckSteps(ctx context.Context) (*OnboardingStepsData, error)
}

// OnboardingStepsData carries raw completion booleans derived from live data.
type OnboardingStepsData struct {
	Company     bool
	Outlet      bool
	FloorLayout bool
	Products    bool
	Warehouse   bool
	Users       bool
}

type onboardingRepository struct {
	db *gorm.DB
}

func NewOnboardingRepository(db *gorm.DB) OnboardingRepository {
	return &onboardingRepository{db: db}
}

// Get retrieves the onboarding record for the active tenant.
// Returns a zero-value record (not persisted) when none exists yet.
func (r *onboardingRepository) Get(ctx context.Context) (*generalModels.TenantOnboarding, error) {
	tenantID := middleware.TenantFromContext(ctx)

	var state generalModels.TenantOnboarding
	err := database.GetDB(ctx, r.db).
		Where("tenant_id = ? AND deleted_at IS NULL", tenantID).
		First(&state).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		return &generalModels.TenantOnboarding{TenantID: tenantID}, nil
	}
	if err != nil {
		return nil, err
	}
	return &state, nil
}

// Save upserts the onboarding record for the active tenant.
func (r *onboardingRepository) Save(ctx context.Context, state *generalModels.TenantOnboarding) error {
	if state.ID == "" {
		// New record — insert
		return database.GetDB(ctx, r.db).Create(state).Error
	}
	return database.GetDB(ctx, r.db).Save(state).Error
}

// CheckSteps queries module tables to determine which setup steps have been completed.
// Company is considered complete when any identifying field (address, phone, email, npwp) is filled.
// All other steps are complete when at least one record exists in the relevant table.
func (r *onboardingRepository) CheckSteps(ctx context.Context) (*OnboardingStepsData, error) {
	var steps OnboardingStepsData
	g, gCtx := errgroup.WithContext(ctx)

	count := func(c context.Context, table string, where string, args ...interface{}) (int64, error) {
		var total int64
		query := database.GetDB(c, r.db).Table(table)
		if where != "" {
			query = query.Where(where, args...)
		}
		if err := query.Count(&total).Error; err != nil {
			return 0, err
		}
		return total, nil
	}

	var companyCount, outletCount, floorCount, productCount, warehouseCount, userCount int64

	g.Go(func() error {
		var err error
		companyCount, err = count(gCtx, "companies", "deleted_at IS NULL AND (address <> '' OR phone <> '' OR email <> '' OR npwp <> '')")
		return err
	})

	g.Go(func() error {
		var err error
		outletCount, err = count(gCtx, "outlets", "deleted_at IS NULL")
		return err
	})

	g.Go(func() error {
		var err error
		floorCount, err = count(gCtx, "pos_floor_plans", "deleted_at IS NULL")
		return err
	})

	g.Go(func() error {
		var err error
		productCount, err = count(gCtx, "products", "deleted_at IS NULL")
		return err
	})

	g.Go(func() error {
		var err error
		warehouseCount, err = count(gCtx, "warehouses", "deleted_at IS NULL")
		return err
	})

	g.Go(func() error {
		var err error
		userCount, err = count(gCtx, "users", "deleted_at IS NULL")
		return err
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	steps.Company = companyCount > 0
	steps.Outlet = outletCount > 0
	steps.FloorLayout = floorCount > 0
	steps.Products = productCount > 0
	steps.Warehouse = warehouseCount > 0
	steps.Users = userCount > 1

	return &steps, nil
}
