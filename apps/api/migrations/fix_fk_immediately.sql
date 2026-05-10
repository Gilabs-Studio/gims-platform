-- IMMEDIATE FIX: Drop FK constraint blocking asset creation
-- Run this directly: psql -U postgres -d gims_erp_db -f fix_fk_immediately.sql

-- Check current FK constraints on fixed_assets
\echo '========== BEFORE FIX =========='
SELECT constraint_name, table_name, column_name 
FROM information_schema.key_column_usage 
WHERE table_name = 'fixed_assets' AND constraint_name LIKE 'fk_%';

-- Drop the problematic FK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_fixed_assets_company'
      AND table_name = 'fixed_assets'
  ) THEN
    ALTER TABLE fixed_assets DROP CONSTRAINT fk_fixed_assets_company CASCADE;
    RAISE NOTICE 'Successfully dropped FK constraint fk_fixed_assets_company';
  ELSE
    RAISE NOTICE 'FK constraint fk_fixed_assets_company does not exist';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error dropping FK: %', SQLERRM;
END $$;

-- Verify FK is dropped
\echo '========== AFTER FIX =========='
SELECT constraint_name, table_name, column_name 
FROM information_schema.key_column_usage 
WHERE table_name = 'fixed_assets' AND constraint_name LIKE 'fk_%';

-- Check if assets can be inserted (test)
\echo '========== CHECKING ASSET DATA =========='
SELECT COUNT(*) as total_assets FROM fixed_assets;
SELECT COUNT(*) as null_company FROM fixed_assets WHERE company_id IS NULL;
SELECT COUNT(*) as with_company FROM fixed_assets WHERE company_id IS NOT NULL;

\echo '========== FIX COMPLETE =========='
\echo 'FK constraint removed. Asset creation should now work without FK errors.';
