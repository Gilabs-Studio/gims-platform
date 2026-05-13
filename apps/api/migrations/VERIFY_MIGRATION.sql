-- Production Migration Verification & Debugging Checklist
-- Run this AFTER migrations to verify they succeeded

-- =============================================================================
-- 1. CHECK MIGRATION STATUS
-- =============================================================================

-- Verify all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'asset_categories', 'asset_locations', 'fixed_assets',
  'asset_depreciation_schedules', 'asset_disposals', 'asset_attachments',
  'asset_audit_logs', 'asset_transfers', 'asset_maintenance_logs'
);
-- Expected: All 9 tables should return

-- =============================================================================
-- 2. CHECK COLUMN EXISTENCE (Issue: Column not found errors)
-- =============================================================================

-- Verify fixed_assets critical columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'fixed_assets'
AND column_name IN ('code', 'asset_type', 'company_id', 'tenant_id', 'category_id', 'location_id');
-- Expected: All 6 columns should return

-- Verify asset_locations columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'asset_locations'
AND column_name IN ('code', 'name', 'is_active');
-- Expected: All 3 columns should return

-- Verify asset_attachments columns (issue: attachment_type vs file_type)
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'asset_attachments'
AND column_name IN ('attachment_type', 'file_type', 'file_path');
-- Expected: All 3 columns should exist (or 2 if attachment_type renamed)

-- Verify asset_audit_logs columns (issue: changed_at vs performed_at)
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'asset_audit_logs'
AND column_name IN ('changed_at', 'performed_at', 'action');
-- Expected: At least 2 of these 3 columns should exist

-- =============================================================================
-- 3. CHECK FK CONSTRAINTS (Issue: FK violation when creating assets)
-- =============================================================================

-- List all FK constraints on fixed_assets
SELECT constraint_name, column_name, foreign_table_name
FROM information_schema.key_column_usage
WHERE table_name = 'fixed_assets'
AND constraint_type = 'FOREIGN KEY';

-- Check if fk_fixed_assets_company exists and is valid
SELECT EXISTS (
  SELECT 1 FROM information_schema.table_constraints
  WHERE constraint_name = 'fk_fixed_assets_company'
    AND table_name = 'fixed_assets'
) AS fk_company_exists;
-- Expected: true or false

-- =============================================================================
-- 4. CHECK FK DATA VIOLATIONS (Root cause of asset creation errors)
-- =============================================================================

-- Check for orphan company_id values
SELECT COUNT(*) as orphan_count
FROM fixed_assets fa
WHERE fa.company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = fa.company_id);
-- Expected: 0 (zero orphans means no violation)

-- Show details of orphan records if they exist
SELECT fa.id, fa.code, fa.name, fa.company_id, fa.tenant_id
FROM fixed_assets fa
WHERE fa.company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = fa.company_id)
LIMIT 10;

-- Check for orphan category_id values
SELECT COUNT(*) as orphan_category_count
FROM fixed_assets fa
WHERE fa.category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM asset_categories ac WHERE ac.id = fa.category_id);
-- Expected: 0

-- Check for orphan location_id values
SELECT COUNT(*) as orphan_location_count
FROM fixed_assets fa
WHERE fa.location_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM asset_locations al WHERE al.id = fa.location_id);
-- Expected: 0

-- =============================================================================
-- 5. FIX FK VIOLATIONS (Run if orphan counts > 0)
-- =============================================================================

-- FIX OPTION A: Set company_id to NULL for orphans (safest)
UPDATE fixed_assets
SET company_id = NULL
WHERE company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = company_id);

-- FIX OPTION B: Assign to tenant's first company (if you prefer)
UPDATE fixed_assets fa
SET company_id = (
  SELECT c.id FROM companies c
  WHERE c.tenant_id = fa.tenant_id
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE fa.company_id IS NULL
  AND fa.tenant_id IS NOT NULL;

-- FIX OPTION C: Set category_id and location_id to default/valid values
-- (First, check what categories exist for this tenant)
SELECT id, name FROM asset_categories LIMIT 5;

UPDATE fixed_assets fa
SET category_id = (
  SELECT id FROM asset_categories ac
  WHERE ac.name = 'General Assets'  -- Or your default category
  LIMIT 1
)
WHERE fa.category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM asset_categories ac WHERE ac.id = fa.category_id);

-- =============================================================================
-- 6. DROP AND RECREATE FK CONSTRAINTS (If violations found)
-- =============================================================================

-- Drop problematic FK
ALTER TABLE fixed_assets DROP CONSTRAINT IF EXISTS fk_fixed_assets_company;

-- Clean data first (see options above)
-- Then recreate FK
ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_company
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- =============================================================================
-- 7. VERIFY FK CONSTRAINTS ARE NOW VALID
-- =============================================================================

-- Test insert with NULL company_id (should succeed)
BEGIN TRANSACTION;
INSERT INTO fixed_assets (
  id, tenant_id, code, name, asset_type, category_id, location_id,
  acquisition_date, acquisition_cost
) VALUES (
  'test-uuid-1'::uuid,
  (SELECT id FROM tenants LIMIT 1),
  'TEST-001',
  'Test Asset',
  'TANGIBLE',
  (SELECT id FROM asset_categories LIMIT 1),
  (SELECT id FROM asset_locations LIMIT 1),
  CURRENT_DATE,
  1000000
);
-- If this succeeds, FK is valid
ROLLBACK TRANSACTION;

-- =============================================================================
-- 8. CHECK INDEX STATUS (Issue: Indexes on non-existent columns)
-- =============================================================================

-- List all indexes on fixed_assets and check if they're valid
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fixed_assets'
ORDER BY indexname;

-- Check for invalid indexes (will show as INVALID if problematic)
SELECT schemaname, tablename, indexname, idx_scan as scan_count
FROM pg_stat_user_indexes
WHERE tablename IN ('fixed_assets', 'asset_categories', 'asset_attachments')
ORDER BY tablename, indexname;

-- =============================================================================
-- 9. SUMMARY REPORT
-- =============================================================================

-- Run all checks and show summary
DO $$
DECLARE
  v_table_count INT;
  v_orphan_company INT;
  v_orphan_category INT;
  v_orphan_location INT;
  v_fk_exists BOOLEAN;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO v_table_count FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('asset_categories', 'asset_locations', 'fixed_assets', 
                    'asset_depreciation_schedules', 'asset_disposals', 'asset_attachments',
                    'asset_audit_logs', 'asset_transfers', 'asset_maintenance_logs');

  -- Count orphans
  SELECT COUNT(*) INTO v_orphan_company FROM fixed_assets fa
  WHERE fa.company_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = fa.company_id);

  SELECT COUNT(*) INTO v_orphan_category FROM fixed_assets fa
  WHERE fa.category_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM asset_categories ac WHERE ac.id = fa.category_id);

  SELECT COUNT(*) INTO v_orphan_location FROM fixed_assets fa
  WHERE fa.location_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM asset_locations al WHERE al.id = fa.location_id);

  -- Check FK
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_fixed_assets_company'
      AND table_name = 'fixed_assets'
  ) INTO v_fk_exists;

  -- Print summary
  RAISE NOTICE '====== MIGRATION VERIFICATION REPORT ======';
  RAISE NOTICE 'Asset tables created: %/9', v_table_count;
  RAISE NOTICE 'Orphan company_id records: %', v_orphan_company;
  RAISE NOTICE 'Orphan category_id records: %', v_orphan_category;
  RAISE NOTICE 'Orphan location_id records: %', v_orphan_location;
  RAISE NOTICE 'FK fk_fixed_assets_company exists: %', v_fk_exists;
  
  IF v_table_count = 9 AND v_orphan_company = 0 AND v_orphan_category = 0 AND v_orphan_location = 0 AND v_fk_exists THEN
    RAISE NOTICE '✓ MIGRATIONS OK - Ready for production use';
  ELSE
    RAISE WARNING '✗ ISSUES FOUND - Review failures above and run fixes';
  END IF;
END $$;

-- =============================================================================
-- 10. IF STILL GETTING "FK VIOLATION" ERRORS WHEN CREATING ASSETS
-- =============================================================================

-- Last resort: Make FK DEFERRABLE to allow bulk operations
-- (Only if you understand the implications)
/*
ALTER TABLE fixed_assets DROP CONSTRAINT fk_fixed_assets_company;

ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_company
FOREIGN KEY (company_id) REFERENCES companies(id) 
ON DELETE SET NULL 
DEFERRABLE INITIALLY DEFERRED;
*/

-- Then in application layer, wrap inserts with:
-- SET CONSTRAINTS ALL DEFERRED; -- at start
-- ... do inserts ...
-- SET CONSTRAINTS ALL IMMEDIATE; -- at end

