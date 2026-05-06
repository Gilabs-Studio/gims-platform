-- Migration: Add finance query performance indexes
-- Purpose: Improve query performance for multi-tenant, multi-scope finance operations
-- Created: 2026-05-06

-- Index on journal_entries for tenant + company + date filtering
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_company_date
ON journal_entries(tenant_id, company_id, entry_date DESC);

-- Index on journal_entries for tenant + company + status filtering
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_company_status
ON journal_entries(tenant_id, company_id, status, entry_date DESC);

-- Index on journal_lines for tenant + COA filtering (sub-ledger queries)
CREATE INDEX IF NOT EXISTS idx_journal_lines_tenant_coa
ON journal_lines(tenant_id, chart_of_account_id, created_at DESC);

-- Index on cash_bank_journals for tenant + bank account + date filtering
CREATE INDEX IF NOT EXISTS idx_cash_bank_journals_tenant_bank_date
ON cash_bank_journals(tenant_id, bank_account_id, transaction_date DESC);

-- Index on chart_of_accounts for tenant + code lookups (frequently used in filters)
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant_code
ON chart_of_accounts(tenant_id, code);

-- Composite index for journal entry reference lookups (used in idempotency checks)
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference
ON journal_entries(tenant_id, reference_type, reference_id);

-- Index for chart of accounts parent-child queries
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant_parent
ON chart_of_accounts(tenant_id, parent_id);
