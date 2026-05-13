package seeders

import (
	"log"
	"strings"

	"github.com/gilabs/gims/api/internal/core/infrastructure/database"
	tenantModels "github.com/gilabs/gims/api/internal/tenant/data/models"
	"gorm.io/gorm"
)

// EnsureTenantAccountingDefaults provisions canonical finance defaults for a tenant.
// It is safe to call repeatedly.
func EnsureTenantAccountingDefaults(db *gorm.DB, tenantID string) error {
	if db == nil {
		return gorm.ErrInvalidDB
	}

	normalizedTenantID := strings.TrimSpace(tenantID)
	if normalizedTenantID == "" {
		return gorm.ErrInvalidData
	}

	if err := EnsureTenantChartOfAccounts(db, normalizedTenantID); err != nil {
		return err
	}
	if err := EnsureTenantSystemAccountMappings(db, normalizedTenantID); err != nil {
		return err
	}

	return nil
}

// BackfillTenantFinanceDefaults ensures every existing tenant has COA + mapping defaults.
// Intended for startup migration/backfill and safe to execute repeatedly.
func BackfillTenantFinanceDefaults() error {
	if database.DB == nil {
		return gorm.ErrInvalidDB
	}

	var tenants []tenantModels.Tenant
	if err := database.DB.Where("deleted_at IS NULL").Find(&tenants).Error; err != nil {
		return err
	}

	for _, tenant := range tenants {
		tenantID := strings.TrimSpace(tenant.ID)
		if tenantID == "" {
			continue
		}
		if err := EnsureTenantAccountingDefaults(database.DB, tenantID); err != nil {
			return err
		}
		log.Printf("Ensured tenant finance defaults: tenant_id=%s", tenantID)
	}

	return nil
}
