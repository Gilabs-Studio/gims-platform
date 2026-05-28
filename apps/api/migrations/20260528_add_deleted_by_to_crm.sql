-- Migration: 20260528_add_deleted_by_to_crm.sql
-- Author: Antigravity
-- Purpose: menambahkan kolom `deleted_by` pada tabel `crm_leads` dan `crm_deals` sebagai nullable uuid
-- Rollback: ALTER TABLE crm_leads DROP COLUMN IF EXISTS deleted_by; ALTER TABLE crm_deals DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;
ALTER TABLE crm_deals ADD COLUMN IF NOT EXISTS deleted_by uuid NULL;
