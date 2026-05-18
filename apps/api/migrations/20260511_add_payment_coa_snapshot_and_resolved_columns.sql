-- Add snapshot/resolved COA audit columns for sales and purchase payments.
-- Safe/idempotent: only adds columns if they do not exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sales_payments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sales_payments' AND column_name = 'snapshot_coa_id'
    ) THEN
      ALTER TABLE sales_payments ADD COLUMN snapshot_coa_id UUID REFERENCES chart_of_accounts(id);
      CREATE INDEX IF NOT EXISTS idx_sales_payments_snapshot_coa_id ON sales_payments(snapshot_coa_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sales_payments' AND column_name = 'resolved_coa_id'
    ) THEN
      ALTER TABLE sales_payments ADD COLUMN resolved_coa_id UUID REFERENCES chart_of_accounts(id);
      CREATE INDEX IF NOT EXISTS idx_sales_payments_resolved_coa_id ON sales_payments(resolved_coa_id);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'purchase_payments'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'purchase_payments' AND column_name = 'snapshot_coa_id'
    ) THEN
      ALTER TABLE purchase_payments ADD COLUMN snapshot_coa_id UUID REFERENCES chart_of_accounts(id);
      CREATE INDEX IF NOT EXISTS idx_purchase_payments_snapshot_coa_id ON purchase_payments(snapshot_coa_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'purchase_payments' AND column_name = 'resolved_coa_id'
    ) THEN
      ALTER TABLE purchase_payments ADD COLUMN resolved_coa_id UUID REFERENCES chart_of_accounts(id);
      CREATE INDEX IF NOT EXISTS idx_purchase_payments_resolved_coa_id ON purchase_payments(resolved_coa_id);
    END IF;
  END IF;
END $$;