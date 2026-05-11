-- Migration: Add extended asset fields and new tables
-- Date: 2026-03-19

-- ============================================
-- Part 1: Add columns to fixed_assets table
-- ============================================

ALTER TABLE IF EXISTS fixed_assets
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
ADD COLUMN IF NOT EXISTS qr_code TEXT,
ADD COLUMN IF NOT EXISTS asset_tag VARCHAR(50),
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS business_unit_id UUID,
ADD COLUMN IF NOT EXISTS department_id UUID,
ADD COLUMN IF NOT EXISTS assigned_to_employee_id UUID,
ADD COLUMN IF NOT EXISTS assignment_date DATE,
ADD COLUMN IF NOT EXISTS supplier_id UUID,
ADD COLUMN IF NOT EXISTS purchase_order_id UUID,
ADD COLUMN IF NOT EXISTS supplier_invoice_id UUID,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS installation_cost DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_costs DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(10),
ADD COLUMN IF NOT EXISTS useful_life_months INTEGER,
ADD COLUMN IF NOT EXISTS depreciation_start_date DATE,
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(30) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS is_capitalized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_depreciable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_fully_depreciated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_asset_id UUID,
ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS warranty_start DATE,
ADD COLUMN IF NOT EXISTS warranty_end DATE,
ADD COLUMN IF NOT EXISTS warranty_provider VARCHAR(255),
ADD COLUMN IF NOT EXISTS warranty_terms TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS insurance_provider VARCHAR(255),
ADD COLUMN IF NOT EXISTS insurance_start DATE,
ADD COLUMN IF NOT EXISTS insurance_end DATE,
ADD COLUMN IF NOT EXISTS insurance_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Ensure newly introduced columns stay nullable for backward compatibility.
ALTER TABLE IF EXISTS fixed_assets
ALTER COLUMN serial_number DROP NOT NULL,
ALTER COLUMN barcode DROP NOT NULL,
ALTER COLUMN qr_code DROP NOT NULL,
ALTER COLUMN asset_tag DROP NOT NULL,
ALTER COLUMN company_id DROP NOT NULL,
ALTER COLUMN business_unit_id DROP NOT NULL,
ALTER COLUMN department_id DROP NOT NULL,
ALTER COLUMN assigned_to_employee_id DROP NOT NULL,
ALTER COLUMN assignment_date DROP NOT NULL,
ALTER COLUMN supplier_id DROP NOT NULL,
ALTER COLUMN purchase_order_id DROP NOT NULL,
ALTER COLUMN supplier_invoice_id DROP NOT NULL,
ALTER COLUMN depreciation_method DROP NOT NULL,
ALTER COLUMN useful_life_months DROP NOT NULL,
ALTER COLUMN depreciation_start_date DROP NOT NULL,
ALTER COLUMN parent_asset_id DROP NOT NULL,
ALTER COLUMN warranty_start DROP NOT NULL,
ALTER COLUMN warranty_end DROP NOT NULL,
ALTER COLUMN warranty_provider DROP NOT NULL,
ALTER COLUMN warranty_terms DROP NOT NULL,
ALTER COLUMN insurance_policy_number DROP NOT NULL,
ALTER COLUMN insurance_provider DROP NOT NULL,
ALTER COLUMN insurance_start DROP NOT NULL,
ALTER COLUMN insurance_end DROP NOT NULL,
ALTER COLUMN insurance_value DROP NOT NULL,
ALTER COLUMN approved_by DROP NOT NULL,
ALTER COLUMN approved_at DROP NOT NULL;

-- Add foreign key constraints (with checks to avoid errors if already exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fixed_assets_company') THEN
        ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_company 
        FOREIGN KEY (company_id) REFERENCES companies(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_units')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fixed_assets_business_unit') THEN
        ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_business_unit 
        FOREIGN KEY (business_unit_id) REFERENCES business_units(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fixed_assets_department') THEN
        ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_department 
        FOREIGN KEY (department_id) REFERENCES departments(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fixed_assets_employee') THEN
        ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_employee 
        FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fixed_assets_supplier') THEN
        ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_supplier 
        FOREIGN KEY (supplier_id) REFERENCES contacts(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fixed_assets_parent') THEN
        ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_parent 
        FOREIGN KEY (parent_asset_id) REFERENCES fixed_assets(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixed_assets')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fixed_assets_approved_by') THEN
        ALTER TABLE fixed_assets ADD CONSTRAINT fk_fixed_assets_approved_by 
        FOREIGN KEY (approved_by) REFERENCES users(id);
    END IF;
END $$;

-- ============================================
-- Part 2: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_assets_serial ON fixed_assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_barcode ON fixed_assets(barcode);
CREATE INDEX IF NOT EXISTS idx_assets_company ON fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_employee ON fixed_assets(assigned_to_employee_id);
CREATE INDEX IF NOT EXISTS idx_assets_lifecycle ON fixed_assets(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON fixed_assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_supplier ON fixed_assets(supplier_id);
CREATE INDEX IF NOT EXISTS idx_assets_warranty_end ON fixed_assets(warranty_end);

-- ============================================
-- Part 3: Create asset_attachments table
-- ============================================

CREATE TABLE IF NOT EXISTS asset_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('invoice', 'warranty', 'photo', 'manual', 'other')),
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS asset_attachments
    ADD COLUMN IF NOT EXISTS file_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS file_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_attachments' AND column_name = 'attachment_type')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_attachments' AND column_name = 'file_type') THEN
        UPDATE asset_attachments
        SET file_type = COALESCE(file_type,
            CASE LOWER(attachment_type)
                WHEN 'invoice' THEN 'invoice'
                WHEN 'warranty' THEN 'warranty'
                WHEN 'photo' THEN 'photo'
                WHEN 'manual' THEN 'manual'
                ELSE 'other'
            END
        )
        WHERE file_type IS NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_attachments' AND column_name = 'file_path')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_attachments' AND column_name = 'file_url') THEN
        UPDATE asset_attachments
        SET file_url = COALESCE(file_url, file_path)
        WHERE file_url IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_asset_attachments_file_type'
    ) THEN
        ALTER TABLE asset_attachments
            ADD CONSTRAINT chk_asset_attachments_file_type
            CHECK (file_type IS NULL OR file_type IN ('invoice', 'warranty', 'photo', 'manual', 'other'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asset_attachments_asset ON asset_attachments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_attachments_type ON asset_attachments(file_type);

-- ============================================
-- Part 4: Create asset_audit_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS asset_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    changes JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_asset_audit_asset ON asset_audit_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_audit_action ON asset_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_asset_audit_date ON asset_audit_logs(performed_at);

-- ============================================
-- Part 5: Create asset_assignment_histories table
-- ============================================

CREATE TABLE IF NOT EXISTS asset_assignment_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    asset_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    department_id UUID REFERENCES departments(id),
    location_id UUID,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    returned_at TIMESTAMPTZ,
    return_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'asset_assignment_histories')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_asset_assignment_histories_location') THEN
        ALTER TABLE asset_assignment_histories
            ADD CONSTRAINT fk_asset_assignment_histories_location
            FOREIGN KEY (location_id) REFERENCES locations(id);
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'asset_assignment_histories')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'asset_locations')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_asset_assignment_histories_location') THEN
        ALTER TABLE asset_assignment_histories
            ADD CONSTRAINT fk_asset_assignment_histories_location
            FOREIGN KEY (location_id) REFERENCES asset_locations(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asset_assignment_asset ON asset_assignment_histories(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignment_employee ON asset_assignment_histories(employee_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignment_date ON asset_assignment_histories(assigned_at);

-- ============================================
-- Part 6: Update existing data (if any)
-- ============================================

-- Set lifecycle_stage based on existing status
UPDATE fixed_assets 
SET lifecycle_stage = CASE 
    WHEN status = 'draft' THEN 'draft'
    WHEN status = 'active' THEN 'active'
    WHEN status = 'sold' THEN 'sold'
    WHEN status = 'disposed' THEN 'disposed'
    ELSE 'active'
END
WHERE lifecycle_stage IS NULL OR lifecycle_stage = '';

-- Set is_capitalized = true for existing assets with book entries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'is_capitalized')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'journal_entries') THEN
    UPDATE fixed_assets 
    SET is_capitalized = true 
    WHERE id IN (
        SELECT DISTINCT reference_id::UUID 
        FROM journal_entries 
        WHERE reference_type = 'fixed_asset'
          AND reference_id IS NOT NULL
    );
  END IF;
END $$;

-- Migration completed successfully
