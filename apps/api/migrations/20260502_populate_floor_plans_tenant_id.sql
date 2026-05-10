-- Migration to populate tenant_id for existing floor plans and layout versions from their related outlets
-- This fixes the issue where floor plans without tenant_id were not being retrieved due to scope filtering

BEGIN;

-- Update floor_plans tenant_id from related outlets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_floor_plans')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'outlets') THEN
    UPDATE pos_floor_plans
    SET tenant_id = o.tenant_id
    FROM outlets o
    WHERE pos_floor_plans.outlet_id = o.id
      AND pos_floor_plans.tenant_id IS NULL
      AND o.tenant_id IS NOT NULL
      AND pos_floor_plans.deleted_at IS NULL;
  END IF;
END $$;

-- Update layout_versions tenant_id from related floor_plans
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_layout_versions')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pos_floor_plans') THEN
    UPDATE pos_layout_versions
    SET tenant_id = fp.tenant_id
    FROM pos_floor_plans fp
    WHERE pos_layout_versions.floor_plan_id = fp.id
      AND pos_layout_versions.tenant_id IS NULL
      AND fp.tenant_id IS NOT NULL;
  END IF;
END $$;

-- Log the results
-- The UPDATE statements will populate tenant_id for all records that:
-- 1. Currently have NULL tenant_id
-- 2. Have valid relationships to parent records with tenant_id
-- 3. Are not soft-deleted (for floor_plans)

COMMIT;
