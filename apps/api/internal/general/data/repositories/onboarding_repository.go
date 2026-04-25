package repositories

import (
	"context"
	"errors"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	"github.com/gilabs/gims/api/internal/core/middleware"
	generalModels "github.com/gilabs/gims/api/internal/general/data/models"
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
	FiscalYear  bool
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
	db := database.GetDB(ctx, r.db)
	tenantID := middleware.TenantFromContext(ctx)

	var steps OnboardingStepsData

	// Company: registration always creates a row; it is "done" only when detail fields are filled.
	var companyCount int64
	db.Table("companies").
		Where("deleted_at IS NULL AND (address <> '' OR phone <> '' OR email <> '' OR npwp <> '')").
		Count(&companyCount)
	steps.Company = companyCount > 0

	// Outlet
	var outletCount int64
	db.Table("outlets").Where("deleted_at IS NULL").Count(&outletCount)
	steps.Outlet = outletCount > 0

	// POS Floor Plan (F&B-specific, but we check for all business types)
	var floorCount int64
	db.Table("pos_floor_plans").Where("deleted_at IS NULL").Count(&floorCount)
	steps.FloorLayout = floorCount > 0

	// Products
	var productCount int64
	db.Table("products").Where("deleted_at IS NULL").Count(&productCount)
	steps.Products = productCount > 0

	// Warehouse
	var warehouseCount int64
	db.Table("warehouses").Where("deleted_at IS NULL").Count(&warehouseCount)
	steps.Warehouse = warehouseCount > 0

	// Users: more than 1 means additional team members have been added
	var userCount int64
	db.Table("users").Where("deleted_at IS NULL").Count(&userCount)
	steps.Users = userCount > 1

	// FiscalYear: at least one fiscal year exists for tenant-owned companies.
	var fiscalYearCount int64
	if tenantID != "" {
		err := r.db.WithContext(ctx).
			Table("fiscal_years fy").
			Joins("JOIN companies c ON c.id = fy.company_id AND c.deleted_at IS NULL").
			Where("fy.deleted_at IS NULL").
			Where("(fy.tenant_id = ? OR c.tenant_id = ?)", tenantID, tenantID).
			Count(&fiscalYearCount).Error
		if err != nil {
			// Fallback to tenant-scoped default query path.
			db.Table("fiscal_years").Where("deleted_at IS NULL").Count(&fiscalYearCount)
		}
	} else {
		db.Table("fiscal_years").Where("deleted_at IS NULL").Count(&fiscalYearCount)
	}
	steps.FiscalYear = fiscalYearCount > 0

	return &steps, nil
}
