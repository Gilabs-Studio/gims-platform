-- Migration: Fix fixed assets schema gaps for tenant-safe multi-table workflows
-- Created: 2026-05-10

-- GAP-01: promote deprecated assets table name to fixed_assets where needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'assets'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'fixed_assets'
    ) THEN
        ALTER TABLE assets RENAME TO fixed_assets;
    END IF;
END $$;

-- GAP-02: standardize assignment history table to plural name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'asset_assignment_history'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'asset_assignment_histories'
    ) THEN
        ALTER TABLE asset_assignment_history RENAME TO asset_assignment_histories;
    END IF;
END $$;

ALTER INDEX IF EXISTS idx_asset_assignment_asset RENAME TO idx_asset_assignment_histories_asset;
ALTER INDEX IF EXISTS idx_asset_assignment_employee RENAME TO idx_asset_assignment_histories_employee;
ALTER INDEX IF EXISTS idx_asset_assignment_date RENAME TO idx_asset_assignment_histories_date;

ALTER TABLE IF EXISTS asset_assignment_histories
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

CREATE INDEX IF NOT EXISTS idx_asset_assignment_histories_tenant
    ON asset_assignment_histories(tenant_id);

-- GAP-06: depreciation schedules must be tenant-scoped
ALTER TABLE IF EXISTS asset_depreciation_schedules
    ADD COLUMN IF NOT EXISTS tenant_id UUID;

ALTER TABLE IF EXISTS asset_depreciation_schedules
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_asset_depreciation_schedules_tenant_period
    ON asset_depreciation_schedules(tenant_id, asset_id, period_month);

-- GAP-09: support attachments linked to workflow records
ALTER TABLE IF EXISTS asset_attachments
    ADD COLUMN IF NOT EXISTS tenant_id UUID,
    ADD COLUMN IF NOT EXISTS attachable_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS attachable_id UUID;

CREATE INDEX IF NOT EXISTS idx_asset_attachments_tenant_asset
    ON asset_attachments(tenant_id, asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_attachments_attachable
    ON asset_attachments(attachable_type, attachable_id);

-- GAP-11: explicit asset_transactions schema for new tenants and existing databases
CREATE TABLE IF NOT EXISTS asset_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    amount NUMERIC(15,2) DEFAULT 0,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    reference_type VARCHAR(50),
    reference_id UUID,
    book_value_at_transaction NUMERIC(15,2),
    gain_loss_amount NUMERIC(15,2),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS asset_transactions
    ADD COLUMN IF NOT EXISTS tenant_id UUID,
    ADD COLUMN IF NOT EXISTS asset_id UUID,
    ADD COLUMN IF NOT EXISTS type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS transaction_date DATE,
    ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reference_id UUID,
    ADD COLUMN IF NOT EXISTS book_value_at_transaction NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS gain_loss_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_asset_txn_tenant
    ON asset_transactions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_asset_txn_asset_type
    ON asset_transactions(asset_id, type, status);

-- Recommended dashboard/list indexes
CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant_status_warranty
    ON fixed_assets(tenant_id, status, warranty_end)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant_status_insurance
    ON fixed_assets(tenant_id, status, insurance_end)
    WHERE deleted_at IS NULL;
