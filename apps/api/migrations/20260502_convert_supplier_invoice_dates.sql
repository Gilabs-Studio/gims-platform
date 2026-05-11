-- Migration: Convert SupplierInvoice InvoiceDate and DueDate from varchar to date
-- Date: 2026-05-02
-- Reason: Ensure type consistency across the system (issue #8 - SupplierInvoice dates)

BEGIN;

-- Convert existing string dates to date type
ALTER TABLE supplier_invoices
  ALTER COLUMN invoice_date TYPE date USING invoice_date::date,
  ALTER COLUMN due_date TYPE date USING due_date::date;

-- Verify conversion
SELECT COUNT(*) as total_records, 
       COUNT(invoice_date) as invoice_dates_set,
       COUNT(due_date) as due_dates_set
FROM supplier_invoices
WHERE deleted_at IS NULL;

COMMIT;
