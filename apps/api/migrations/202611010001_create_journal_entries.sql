-- Journal entries base table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  created_by UUID,
  is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  source_document_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference_type ON journal_entries(reference_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference_id ON journal_entries(reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entries_updated_at ON journal_entries(updated_at);
