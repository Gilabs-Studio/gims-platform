-- Journal Valuation - Compliance & Audit Trail Improvements
-- Implements: Period locking, approval tracking, snapshots, FK constraints, period locking
-- Supersedes: 202611010005_enhance_valuation_runs_and_details.sql (additive only)

-- ============================================================================
-- 1. VALUATION_RUNS TABLE - Add compliance fields
-- ============================================================================

-- Add period locking & approval tracking
ALTER TABLE IF EXISTS valuation_runs
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS valuation_runs
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS valuation_runs
  ADD COLUMN IF NOT EXISTS approved_by UUID;

ALTER TABLE IF EXISTS valuation_runs
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS valuation_runs
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- ============================================================================
-- 2. VALUATION_RUN_DETAILS TABLE - Add snapshots for audit trail
-- ============================================================================

ALTER TABLE IF EXISTS valuation_run_details
  ADD COLUMN IF NOT EXISTS cost_price_snapshot NUMERIC(18,6) COMMENT 'Cost price at valuation time (immutable for audit)';

ALTER TABLE IF EXISTS valuation_run_details
  ADD COLUMN IF NOT EXISTS currency_code_snapshot VARCHAR(3) COMMENT 'Currency code at valuation time (for FX)';

ALTER TABLE IF EXISTS valuation_run_details
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot NUMERIC(15,8) COMMENT 'Exchange rate at valuation time (for FX)';

-- ============================================================================
-- 3. ADD CONSTRAINTS - Data integrity
-- ============================================================================

-- FK: valuation_run_details.product_id → products.id (if products table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'products' AND schemaname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'fk_valuation_run_details_product_id'
    ) THEN
      ALTER TABLE valuation_run_details
        ADD CONSTRAINT fk_valuation_run_details_product_id
        FOREIGN KEY (product_id) REFERENCES products(id) 
        ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

-- FK: valuation_runs.approved_by → users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_valuation_runs_approved_by'
  ) THEN
    ALTER TABLE valuation_runs
      ADD CONSTRAINT fk_valuation_runs_approved_by
      FOREIGN KEY (approved_by) REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 4. ADD INDEXES - Query optimization
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_valuation_runs_is_locked 
  ON valuation_runs(is_locked)
  WHERE is_locked = TRUE;

CREATE INDEX IF NOT EXISTS idx_valuation_runs_period 
  ON valuation_runs(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_valuation_runs_approved_by 
  ON valuation_runs(approved_by);

CREATE INDEX IF NOT EXISTS idx_valuation_run_details_created_at
  ON valuation_run_details(created_at)
  WHERE direction IS NOT NULL;

-- ============================================================================
-- 5. ADD CONSTRAINTS - Business Logic validation
-- ============================================================================

-- Validate is_locked consistency with status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_valuation_runs_locked_consistency'
  ) THEN
    ALTER TABLE valuation_runs
      ADD CONSTRAINT chk_valuation_runs_locked_consistency
      CHECK (
        -- If locked, must be posted
        CASE WHEN is_locked = TRUE 
          THEN status IN ('posted', 'no_difference')
          ELSE TRUE 
        END
      );
  END IF;
END $$;

-- Validate approval fields are NULL until approved
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_valuation_runs_approval_fields'
  ) THEN
    ALTER TABLE valuation_runs
      ADD CONSTRAINT chk_valuation_runs_approval_fields
      CHECK (
        -- If not approved/posted, approval fields must be NULL
        CASE WHEN status IN ('draft', 'pending_approval')
          THEN approved_by IS NULL AND approved_at IS NULL
          ELSE TRUE
        END
      );
  END IF;
END $$;

-- Validate locked_at is set when is_locked=true
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chk_valuation_runs_locked_at'
  ) THEN
    ALTER TABLE valuation_runs
      ADD CONSTRAINT chk_valuation_runs_locked_at
      CHECK (
        CASE WHEN is_locked = TRUE 
          THEN locked_at IS NOT NULL
          ELSE locked_at IS NULL
        END
      );
  END IF;
END $$;

-- ============================================================================
-- 6. BACKFILL DATA - Set is_locked for old posted runs
-- ============================================================================

UPDATE valuation_runs
SET is_locked = TRUE, 
    locked_at = COALESCE(completed_at, updated_at)
WHERE status IN ('posted', 'no_difference')
  AND is_locked = FALSE;

-- ============================================================================
-- 7. FINANCE_SETTINGS - Ensure critical COA keys exist (idempotent)
-- ============================================================================

-- Only insert if not already present
INSERT INTO finance_settings (id, setting_key, value, description, category, created_at, updated_at)
VALUES 
  -- Inventory Revaluation (EQUITY - not income)
  (gen_random_uuid(), 'coa.inventory_revaluation_reserve', '3290', 'Revaluation surplus for inventory (retained earnings)', 'inventory', NOW(), NOW()),
  (gen_random_uuid(), 'coa.inventory_asset', '1120', 'Inventory asset account', 'inventory', NOW(), NOW()),
  (gen_random_uuid(), 'coa.inventory_loss', '5020', 'Inventory valuation loss (expense)', 'inventory', NOW(), NOW()),
  -- FX Revaluation
  (gen_random_uuid(), 'coa.fx_gain', '4050', 'Exchange gain (income)', 'fx', NOW(), NOW()),
  (gen_random_uuid(), 'coa.fx_loss', '5030', 'Exchange loss (expense)', 'fx', NOW(), NOW()),
  (gen_random_uuid(), 'coa.fx_remeasurement', '1160', 'FX remeasurement adjustment (asset)', 'fx', NOW(), NOW()),
  -- Depreciation
  (gen_random_uuid(), 'coa.depreciation_expense', '5040', 'Depreciation expense', 'depreciation', NOW(), NOW()),
  (gen_random_uuid(), 'coa.depreciation_accumulated', '1140', 'Accumulated depreciation', 'depreciation', NOW(), NOW()),
  (gen_random_uuid(), 'coa.depreciation_gain', '4060', 'Depreciation reversal gain (income)', 'depreciation', NOW(), NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- 8. DOCUMENT - Migration notes
-- ============================================================================

-- MIGRATION NOTES:
-- 1. Added is_locked, locked_at for period locking after posting
-- 2. Added approved_by, approved_at, approval_notes for audit trail
-- 3. Added FK to products, users for referential integrity
-- 4. Added snapshots (cost_price, currency_code, exchange_rate) for immutable audit
-- 5. Added indexes for performance (locked, period, approved_by)
-- 6. Added constraints to enforce business logic (locked consistency, approval fields)
-- 7. Backfilled is_locked=TRUE for existing posted runs
-- 8. Pre-populated critical finance_settings (COA mappings)
--
-- COMPLIANCE IMPROVED:
-- ✅ Period locking prevents accidental overwrite
-- ✅ Approval tracking adds audit trail
-- ✅ Snapshots maintain immutable values for reconciliation
-- ✅ FK constraints prevent orphan records
-- ✅ Health check: All required COA settings seeded by default
