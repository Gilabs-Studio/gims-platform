-- Journal reversal linkage table
CREATE TABLE IF NOT EXISTS journal_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_journal_entry_id UUID NOT NULL,
  reversal_journal_entry_id UUID NOT NULL,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT fk_journal_reversals_original FOREIGN KEY (original_journal_entry_id) REFERENCES journal_entries(id),
  CONSTRAINT fk_journal_reversals_reversal FOREIGN KEY (reversal_journal_entry_id) REFERENCES journal_entries(id),
  CONSTRAINT uq_journal_reversals_reversal UNIQUE (reversal_journal_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_journal_reversals_original_journal_entry_id ON journal_reversals(original_journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_reversals_updated_at ON journal_reversals(updated_at);
