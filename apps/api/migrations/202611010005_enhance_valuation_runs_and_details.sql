-- Enhance valuation run workflow and audit detail storage
-- 1) Expand valuation_runs for new workflow status and delta tracking
ALTER TABLE IF EXISTS valuation_runs
  ADD COLUMN IF NOT EXISTS total_delta NUMERIC(18,2) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS valuation_runs
  ALTER COLUMN status TYPE VARCHAR(30);

ALTER TABLE IF EXISTS valuation_runs
  ALTER COLUMN status SET DEFAULT 'draft';

-- Backfill old statuses into the new workflow naming
UPDATE valuation_runs
SET status = CASE
  WHEN status = 'requested' THEN 'draft'
  WHEN status = 'processing' THEN 'pending_approval'
  WHEN status = 'completed' THEN 'posted'
  ELSE status
END
WHERE status IN ('requested', 'processing', 'completed');

-- Align old valuation type naming
UPDATE valuation_runs
SET valuation_type = 'fx'
WHERE valuation_type = 'currency';

-- 2) Create itemized valuation detail table for audit trail
CREATE TABLE IF NOT EXISTS valuation_run_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valuation_run_id UUID NOT NULL,
  reference_id VARCHAR(255) NOT NULL,
  product_id UUID,
  qty NUMERIC(18,6) NOT NULL DEFAULT 0,
  book_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  actual_value NUMERIC(18,2) NOT NULL DEFAULT 0,
  delta NUMERIC(18,2) NOT NULL DEFAULT 0,
  direction VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_valuation_run_details_run
    FOREIGN KEY (valuation_run_id) REFERENCES valuation_runs(id) ON DELETE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_valuation_run_details_direction'
  ) THEN
    ALTER TABLE valuation_run_details
      ADD CONSTRAINT chk_valuation_run_details_direction
      CHECK (direction IN ('gain', 'loss'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_valuation_run_details_run_id ON valuation_run_details(valuation_run_id);
CREATE INDEX IF NOT EXISTS idx_valuation_run_details_reference_id ON valuation_run_details(reference_id);
CREATE INDEX IF NOT EXISTS idx_valuation_run_details_product_id ON valuation_run_details(product_id);
CREATE INDEX IF NOT EXISTS idx_valuation_run_details_direction ON valuation_run_details(direction);
