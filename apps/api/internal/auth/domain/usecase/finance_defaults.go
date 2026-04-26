package usecase

import (
	"context"
	"fmt"
	"strings"

	"github.com/gilabs/gims/api/seeders"
	"gorm.io/gorm"
)

// ensurePOSGrowthAccountingDefaults keeps legacy billing flows compatible by
// ensuring canonical tenant-1 seed data remains available.
func (u *authUsecase) ensurePOSGrowthAccountingDefaults(ctx context.Context, planSlug string) error {
	_ = ctx
	_ = planSlug

	if err := seeders.SeedChartOfAccounts(); err != nil {
		return fmt.Errorf("failed to ensure default chart of accounts from seeder: %w", err)
	}

	if err := seeders.SeedSystemAccountMappings(); err != nil {
		return fmt.Errorf("failed to ensure default system account mappings from seeder: %w", err)
	}

	return nil
}

// ensureTenantAccountingDefaults provisions tenant-scoped COA and mapping
// defaults during tenant registration/backfill.
func (u *authUsecase) ensureTenantAccountingDefaults(tx *gorm.DB, tenantID string) error {
	if tx == nil {
		return gorm.ErrInvalidDB
	}
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return gorm.ErrInvalidData
	}

	if err := seeders.EnsureTenantAccountingDefaults(tx, tenantID); err != nil {
		return fmt.Errorf("failed to ensure tenant accounting defaults: %w", err)
	}

	return nil
}
