-- Migration: Drop priority column from recruitment_requests table
-- Date: 2026-08-17
-- Safe for execution on production database

DROP INDEX IF EXISTS idx_recruitment_priority;
ALTER TABLE recruitment_requests DROP COLUMN IF EXISTS priority;
