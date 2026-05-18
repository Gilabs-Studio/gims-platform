-- Backfill and enforce purchase_payments.company_id as NOT NULL.
-- Safe/idempotent: backfills from supplier invoices first, then employee company mapping,
-- and only applies the NOT NULL constraint when no nulls remain.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchase_payments'
      AND column_name = 'company_id'
      AND is_nullable = 'YES'
  ) THEN
    UPDATE purchase_payments pp
    SET company_id = si.company_id
    FROM supplier_invoices si
    WHERE pp.company_id IS NULL
      AND pp.supplier_invoice_id = si.id
      AND si.company_id IS NOT NULL;

    UPDATE purchase_payments pp
    SET company_id = e.company_id
    FROM employees e
    WHERE pp.company_id IS NULL
      AND pp.created_by = e.user_id
      AND e.deleted_at IS NULL
      AND e.company_id IS NOT NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM purchase_payments
      WHERE company_id IS NULL
    ) THEN
      ALTER TABLE purchase_payments ALTER COLUMN company_id SET NOT NULL;
    ELSE
      RAISE NOTICE 'purchase_payments.company_id still has null values after backfill; NOT NULL was not enforced';
    END IF;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'purchase_payments table does not exist; skipping company_id nullability migration';
END $$;