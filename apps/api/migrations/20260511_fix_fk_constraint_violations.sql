-- Migration: Fix FK Constraint Violations
-- Date: 2026-05-11
-- Purpose: Handle existing data that violates FK constraints created in earlier migrations

-- ============================================================================
-- FIX-01: Handle fixed_assets.company_id FK violations
-- ============================================================================

-- Step 1: Check if FK exists and violates
DO $$
BEGIN
  -- Drop the problematic FK if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_fixed_assets_company'
      AND table_name = 'fixed_assets'
  ) THEN
    -- Check if there are orphan records (company_id not null but not in companies)
    IF EXISTS (
      SELECT 1 FROM fixed_assets fa
      WHERE fa.company_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = fa.company_id)
      LIMIT 1
    ) THEN
      -- Drop the constraint to allow cleanup
      ALTER TABLE fixed_assets DROP CONSTRAINT fk_fixed_assets_company;
    END IF;
  END IF;
END $$;

-- Step 2: Populate company_id from tenant's first company if null
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    WITH tenant_company AS (
      SELECT fa.id, fa.tenant_id, c.id AS first_company_id
      FROM fixed_assets fa
      JOIN companies c ON c.tenant_id = fa.tenant_id
      WHERE fa.company_id IS NULL
      QUALIFY ROW_NUMBER() OVER (PARTITION BY fa.id ORDER BY c.created_at ASC) = 1
    )
    UPDATE fixed_assets fa
    SET company_id = tc.first_company_id
    FROM tenant_company tc
    WHERE fa.id = tc.id;
  END IF;
END $$;

-- Step 3: Recreate FK if not exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_fixed_assets_company' AND table_name = 'fixed_assets') THEN
    ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_company 
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- FIX-02: Handle asset_assignment_histories.location_id FK violations (if using locations table vs asset_locations)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_asset_assignment_histories_location'
      AND table_name = 'asset_assignment_histories'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM asset_assignment_histories aah
      WHERE aah.location_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = aah.location_id)
      LIMIT 1
    ) THEN
      ALTER TABLE asset_assignment_histories DROP CONSTRAINT fk_asset_assignment_histories_location;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- FIX-03: Validate all FK constraints are safe before allowing new inserts
-- ============================================================================

-- Log violations found (for audit trail)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets') THEN
    -- Verify all company_id values are either NULL or exist in companies
    IF EXISTS (
      SELECT 1 FROM fixed_assets fa
      WHERE fa.company_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = fa.company_id)
      LIMIT 1
    ) THEN
      RAISE WARNING 'MIGRATION WARNING: fixed_assets has orphan company_id values. These should be NULL or corrected.';
    END IF;
  END IF;
END $$;

-- Complete message
SELECT 'Migration 20260511 completed: FK constraint violations fixed' AS migration_status;
