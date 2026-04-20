package tenant

import (
	"context"

	"github.com/gilabs/gims/api/internal/core/middleware"
	"gorm.io/gorm"
)

// ScopedDB returns a GORM session scoped to the current tenant.
// Deprecated: prefer using database.GetDB which applies tenant scoping automatically.
// Keep for any legacy call sites that explicitly need a scoped DB without going through GetDB.
func ScopedDB(db *gorm.DB, ctx context.Context) *gorm.DB {
	if middleware.IsSystemAdmin(ctx) {
		return db
	}

	tenantID := middleware.TenantFromContext(ctx)
	if tenantID == "" {
		return db
	}

	return db.Where("tenant_id = ?", tenantID)
}

// WithTenantID sets tenant_id on a model map before creation.
// Useful for repositories that build attribute maps.
func WithTenantID(ctx context.Context, attrs map[string]interface{}) map[string]interface{} {
	tenantID := middleware.TenantFromContext(ctx)
	if tenantID != "" {
		attrs["tenant_id"] = tenantID
	}
	return attrs
}

// SetTenantCallback registers a GORM Create callback that automatically injects
// tenant_id on new records. Query/Update/Delete scoping is handled by database.GetDB
// which applies WHERE tenant_id = ? at the session level — this is more reliable than
// GORM callbacks because the table name is always known at GetDB call time.
func SetTenantCallback(db *gorm.DB) {
	db.Callback().Create().Before("gorm:create").Register("saas:set_tenant_id", func(tx *gorm.DB) {
		if tx.Statement == nil || tx.Statement.Context == nil {
			return
		}
		ctx := tx.Statement.Context
		if middleware.IsSystemAdmin(ctx) {
			return
		}

		tenantID := middleware.TenantFromContext(ctx)
		if tenantID == "" {
			return
		}

		tx.Statement.SetColumn("tenant_id", tenantID, true)
	})
}

