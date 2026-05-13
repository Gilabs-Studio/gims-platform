-- Migration: Convert PurchasePayment PaymentDate from varchar to date
-- Date: 2026-05-02
-- Reason: Ensure type consistency across the system (issue #9 - PurchasePayment dates)

BEGIN;

-- Convert existing string dates to date type
ALTER TABLE purchase_payments
  ALTER COLUMN payment_date TYPE date USING payment_date::date;

-- Verify conversion
SELECT COUNT(*) as total_records,
       COUNT(payment_date) as payment_dates_set
FROM purchase_payments
WHERE deleted_at IS NULL;

COMMIT;
