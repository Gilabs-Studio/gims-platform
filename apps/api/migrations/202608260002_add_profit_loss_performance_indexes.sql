-- Migration: Add indexes for Profit & Loss financial performance reports
-- Safe, idempotent execution for PostgreSQL production databases

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'chart_of_accounts'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_coa_type_code ON chart_of_accounts(type, code);
    END IF;
END $$;
