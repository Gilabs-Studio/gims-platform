-- Migration: Add job position query performance indexes
-- Purpose: Speed up job position list/search queries used by master-data and employee forms
-- Created: 2026-05-14

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'job_positions'
		  AND column_name = 'tenant_id'
	) AND EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'job_positions'
		  AND column_name = 'is_active'
	) AND EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'job_positions'
		  AND column_name = 'updated_at'
	) THEN
		CREATE INDEX IF NOT EXISTS idx_job_positions_tenant_active_updated
		ON job_positions (tenant_id, is_active DESC, updated_at DESC);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'job_positions'
		  AND column_name = 'name'
	) THEN
		CREATE INDEX IF NOT EXISTS idx_job_positions_name_trgm
		ON job_positions USING gin (name gin_trgm_ops);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'job_positions'
		  AND column_name = 'description'
	) THEN
		CREATE INDEX IF NOT EXISTS idx_job_positions_description_trgm
		ON job_positions USING gin (description gin_trgm_ops);
	END IF;
END $$;