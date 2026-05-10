-- Migration: Add finance query performance indexes
-- Purpose: Improve query performance for multi-tenant, multi-scope finance operations
-- Created: 2026-05-06

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'tenant_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'company_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'entry_date') THEN
		CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_company_date
		ON journal_entries(tenant_id, company_id, entry_date DESC);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'tenant_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'company_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'status')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'entry_date') THEN
		CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_company_status
		ON journal_entries(tenant_id, company_id, status, entry_date DESC);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_lines' AND column_name = 'tenant_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_lines' AND column_name = 'chart_of_account_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_lines' AND column_name = 'created_at') THEN
		CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_coa
		ON journal_lines(tenant_id, chart_of_account_id, created_at DESC);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_bank_journals' AND column_name = 'tenant_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_bank_journals' AND column_name = 'bank_account_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cash_bank_journals' AND column_name = 'transaction_date') THEN
		CREATE INDEX IF NOT EXISTS idx_cash_bank_journals_tenant_bank_date
		ON cash_bank_journals(tenant_id, bank_account_id, transaction_date DESC);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chart_of_accounts' AND column_name = 'tenant_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chart_of_accounts' AND column_name = 'code') THEN
		CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant_code
		ON chart_of_accounts(tenant_id, code);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'tenant_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'reference_type')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'reference_id') THEN
		CREATE INDEX IF NOT EXISTS idx_journal_entries_reference
		ON journal_entries(tenant_id, reference_type, reference_id);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chart_of_accounts' AND column_name = 'tenant_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chart_of_accounts' AND column_name = 'parent_id') THEN
		CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant_parent
		ON chart_of_accounts(tenant_id, parent_id);
	END IF;
END $$;
