-- PRODUCTION DIAGNOSTIC SCRIPT
-- Purpose: Check actual schema and FK status without assumptions
-- Date: 2026-05-11

\set ECHO queries

-- Check 1: What tables actually exist
NOTICE 'CHECK 1: Asset-related tables in database';
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'asset%' 
  OR tablename = 'fixed_assets'
ORDER BY tablename;

-- Check 2: fixed_assets schema
NOTICE 'CHECK 2: fixed_assets table structure';
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fixed_assets'
ORDER BY ordinal_position;

-- Check 3: What FK constraints exist on fixed_assets
NOTICE 'CHECK 3: Foreign Key constraints on fixed_assets';
SELECT constraint_name, column_name, referenced_table_name
FROM information_schema.key_column_usage
WHERE table_name = 'fixed_assets'
  AND constraint_name LIKE 'fk_%'
ORDER BY constraint_name;

-- Check 4: Check companies table exists
NOTICE 'CHECK 4: Does companies table exist?';
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'companies'
) as companies_exists;

-- Check 5: Check for orphan company_id
NOTICE 'CHECK 5: Orphan company_id in fixed_assets';
SELECT COUNT(*) as orphan_count
FROM fixed_assets fa
WHERE fa.company_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = fa.company_id);

-- Check 6: Check for NULL company_id
NOTICE 'CHECK 6: NULL company_id in fixed_assets';
SELECT COUNT(*) as null_company_count
FROM fixed_assets
WHERE company_id IS NULL;

-- Check 7: Total fixed_assets count
NOTICE 'CHECK 7: Total fixed_assets records';
SELECT COUNT(*) as total_count FROM fixed_assets;

-- Check 8: Check fk_fixed_assets_company constraint exists
NOTICE 'CHECK 8: FK constraint fk_fixed_assets_company exists?';
SELECT EXISTS (
  SELECT 1 FROM information_schema.table_constraints
  WHERE constraint_name = 'fk_fixed_assets_company'
    AND table_name = 'fixed_assets'
) as fk_exists;

-- Check 9: PostgreSQL version
NOTICE 'CHECK 9: PostgreSQL version';
SELECT version();

-- Check 10: Sample of fixed_assets data
NOTICE 'CHECK 10: Sample of fixed_assets (first 5)';
SELECT id, code, name, company_id, tenant_id
FROM fixed_assets
LIMIT 5;

NOTICE '====== DIAGNOSTIC COMPLETE ======';
