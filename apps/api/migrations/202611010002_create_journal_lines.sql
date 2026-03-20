-- Journal line details table
CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL,
  chart_of_account_id UUID NOT NULL,
  chart_of_account_code_snapshot VARCHAR(50),
  chart_of_account_name_snapshot VARCHAR(200),
  chart_of_account_type_snapshot VARCHAR(20),
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT fk_journal_lines_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal_entry_id ON journal_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_chart_of_account_id ON journal_lines(chart_of_account_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_updated_at ON journal_lines(updated_at);
