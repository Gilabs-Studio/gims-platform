-- Migration: widen supplier invoice columns to match current application models
-- Date: 2026-06-24
-- Purpose: prevent inserts from failing on legacy varchar(20) widths in supplier invoice
--          headers and item snapshot fields after production schema drift.
-- Rollback:
--   Do not shrink these columns automatically in production. Investigate data lengths first.

BEGIN;

ALTER TABLE supplier_invoices
  ALTER COLUMN code TYPE varchar(50),
  ALTER COLUMN invoice_number TYPE varchar(100),
  ALTER COLUMN tax_invoice_number TYPE varchar(100),
  ALTER COLUMN supplier_code_snapshot TYPE varchar(50),
  ALTER COLUMN supplier_name_snapshot TYPE varchar(200),
  ALTER COLUMN payment_terms_name_snapshot TYPE varchar(150);

ALTER TABLE supplier_invoice_items
  ALTER COLUMN product_code_snapshot TYPE varchar(50),
  ALTER COLUMN product_name_snapshot TYPE varchar(200);

COMMIT;
