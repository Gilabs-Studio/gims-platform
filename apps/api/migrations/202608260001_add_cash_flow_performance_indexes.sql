-- Migration: Add Cash Flow Statement performance indexes
-- Purpose: Optimize multi-period filtering on journal_entries and journal_lines for production cash flow reports
-- Created: 2026-08-26

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'status')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'source')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_entries' AND column_name = 'entry_date') THEN
		CREATE INDEX IF NOT EXISTS idx_journal_entries_status_source_date
		ON journal_entries(status, source, entry_date);
	END IF;
END $$;

DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_lines' AND column_name = 'journal_entry_id')
		 AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'journal_lines' AND column_name = 'chart_of_account_id') THEN
		CREATE INDEX IF NOT EXISTS idx_journal_lines_entry_coa
		ON journal_lines(journal_entry_id, chart_of_account_id);
	END IF;
END $$;
