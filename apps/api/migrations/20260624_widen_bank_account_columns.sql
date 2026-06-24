-- Migration: 20260624_widen_bank_account_columns.sql
-- Author: Codex
-- Purpose: widen legacy bank_accounts varchar columns so automatic company finance bootstrap
--          and purchase payment posting do not fail on older production schemas.
-- Rollback:
--   Do not shrink these columns automatically in production. Validate existing data lengths
--   first, then plan a separate controlled rollback if absolutely required.

BEGIN;

ALTER TABLE bank_accounts
  ALTER COLUMN code TYPE varchar(50),
  ALTER COLUMN name TYPE varchar(150),
  ALTER COLUMN account_type TYPE varchar(50),
  ALTER COLUMN account_number TYPE varchar(50),
  ALTER COLUMN account_holder TYPE varchar(150);

COMMIT;
