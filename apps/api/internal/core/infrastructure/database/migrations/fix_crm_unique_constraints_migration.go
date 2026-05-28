package migrations

import (
	"log"

	"gorm.io/gorm"
)

// FixCRMUniqueConstraints replaces the GORM-generated hard unique constraints on
// crm_deals.code and crm_leads.code with soft-delete-aware partial unique indexes.
// The old GORM uniqueIndex tags created indexes WITHOUT the WHERE deleted_at IS NULL
// predicate, causing duplicate-key errors when re-creating a record with the same
// code as a previously soft-deleted one.
func FixCRMUniqueConstraints(db *gorm.DB) error {
	log.Println("Running FixCRMUniqueConstraints migration...")

	// --- crm_deals ---
	if err := db.Exec(`ALTER TABLE crm_deals DROP CONSTRAINT IF EXISTS uq_crm_deals_tenant_code`).Error; err != nil {
		log.Printf("Warning: could not drop crm_deals constraint uq_crm_deals_tenant_code (may not exist): %v", err)
	}
	if err := db.Exec(`DROP INDEX IF EXISTS uq_crm_deals_tenant_code`).Error; err != nil {
		log.Printf("Warning: could not drop crm_deals index uq_crm_deals_tenant_code: %v", err)
	}
	// Re-create as partial index (safe to run multiple times)
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_deals_tenant_code_active
		ON crm_deals ((COALESCE(tenant_id::text, '__global__')), lower(code))
		WHERE deleted_at IS NULL AND COALESCE(code, '') <> ''
	`).Error; err != nil {
		return err
	}

	// --- crm_leads ---
	if err := db.Exec(`ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS uq_crm_leads_tenant_code`).Error; err != nil {
		log.Printf("Warning: could not drop crm_leads constraint uq_crm_leads_tenant_code (may not exist): %v", err)
	}
	if err := db.Exec(`DROP INDEX IF EXISTS uq_crm_leads_tenant_code`).Error; err != nil {
		log.Printf("Warning: could not drop crm_leads index uq_crm_leads_tenant_code: %v", err)
	}
	if err := db.Exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS uq_crm_leads_tenant_code_active
		ON crm_leads ((COALESCE(tenant_id::text, '__global__')), lower(code))
		WHERE deleted_at IS NULL AND COALESCE(code, '') <> ''
	`).Error; err != nil {
		return err
	}

	log.Println("FixCRMUniqueConstraints migration completed successfully")
	return nil
}
