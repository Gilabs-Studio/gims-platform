-- Fix CRM unique constraints to be soft-delete aware.
-- Replaces the GORM-generated non-partial unique constraints/indexes on
-- crm_deals.code and crm_leads.code with partial unique indexes that only
-- apply to non-deleted records (WHERE deleted_at IS NULL).
-- This prevents duplicate-key errors when creating a deal/lead with the
-- same code as a previously soft-deleted one.

-- ============================================================
-- crm_deals
-- ============================================================
-- Drop any variant of the old constraint / index GORM may have created
ALTER TABLE crm_deals DROP CONSTRAINT IF EXISTS uq_crm_deals_tenant_code;
DROP INDEX IF EXISTS uq_crm_deals_tenant_code;
DROP INDEX IF EXISTS public.uq_crm_deals_tenant_code;

-- Replace with partial unique index (soft-delete-aware)
DROP INDEX IF EXISTS uq_crm_deals_tenant_code_active;
CREATE UNIQUE INDEX uq_crm_deals_tenant_code_active
    ON crm_deals ((COALESCE(tenant_id::text, '__global__')), lower(code))
    WHERE deleted_at IS NULL AND COALESCE(code, '') <> '';

-- ============================================================
-- crm_leads
-- ============================================================
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS uq_crm_leads_tenant_code;
DROP INDEX IF EXISTS uq_crm_leads_tenant_code;
DROP INDEX IF EXISTS public.uq_crm_leads_tenant_code;

DROP INDEX IF EXISTS uq_crm_leads_tenant_code_active;
CREATE UNIQUE INDEX uq_crm_leads_tenant_code_active
    ON crm_leads ((COALESCE(tenant_id::text, '__global__')), lower(code))
    WHERE deleted_at IS NULL AND COALESCE(code, '') <> '';
