-- Make purchase_payments.bank_account_id nullable for cash payment handling.
-- This is intentionally conservative: it only relaxes the constraint when the column exists.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchase_payments'
      AND column_name = 'bank_account_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE purchase_payments ALTER COLUMN bank_account_id DROP NOT NULL;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'purchase_payments table does not exist; skipping nullability migration';
END $$;