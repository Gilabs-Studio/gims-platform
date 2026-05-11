-- Migration: Create Fixed Asset Management Tables
-- Created: 2024-01-15
-- Description: Comprehensive fixed asset management schema with depreciation support

-- Asset Categories Table
CREATE TABLE IF NOT EXISTS asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  
  -- Default Depreciation Settings
  default_useful_life_months INTEGER,
  default_depreciation_method VARCHAR(20),
  default_salvage_value_percent NUMERIC(5,2),
  
  -- Accounting
  fixed_asset_account_code VARCHAR(50),
  depreciation_account_code VARCHAR(50),
  expense_account_code VARCHAR(50),
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT asset_categories_name_unique UNIQUE(name)
);

-- Asset Locations Table
CREATE TABLE IF NOT EXISTS asset_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state_province VARCHAR(100),
  country VARCHAR(100),
  postal_code VARCHAR(20),
  
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT asset_locations_code_unique UNIQUE(code)
);

-- Main Assets Table
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  company_id UUID,
  
  -- Asset Identification
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Asset Classification
  asset_type VARCHAR(50) NOT NULL, 
  -- Values: 'TANGIBLE', 'INTANGIBLE', 'NON_DEPRECIABLE', 'CONSTRUCTION'
  category_id UUID NOT NULL,
  location_id UUID NOT NULL,
  department_id UUID,
  custodian_user_id UUID,
  
  -- Identity Information
  serial_number VARCHAR(100),
  asset_tag VARCHAR(50),
  barcode_or_qr VARCHAR(200),
  
  -- Financial Information
  acquisition_date DATE NOT NULL,
  acquisition_cost NUMERIC(18,2) NOT NULL,
  salvage_value NUMERIC(18,2) DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'IDR',
  exchange_rate NUMERIC(18,6) DEFAULT 1.00,
  
  -- Depreciation Configuration
  depreciation_method VARCHAR(20),
  -- Values: 'SL' (Straight Line), 'DB' (Declining Balance), 'SYD' (Sum of Years Digits), 'UOP' (Units of Production), 'NONE'
  useful_life_months INTEGER,
  depreciation_start_date DATE,
  accumulated_depreciation NUMERIC(18,2) DEFAULT 0,
  book_value NUMERIC(18,2),
  
  -- Supplier/Procurement
  supplier_id UUID,
  supplier_name VARCHAR(200),
  purchase_order_number VARCHAR(100),
  invoice_number VARCHAR(100),
  invoice_date DATE,
  
  -- Status Management
  status VARCHAR(50) DEFAULT 'draft',
  -- Values: 'draft', 'active', 'under_maintenance', 'in_repair', 'disposed', 'sold', 'retired'
  is_active BOOLEAN DEFAULT false,
  activation_date TIMESTAMP,
  disposal_date TIMESTAMP,
  
  -- Warranty & Insurance
  warranty_start_date DATE,
  warranty_end_date DATE,
  insurance_policy_number VARCHAR(100),
  insurance_value NUMERIC(18,2),
  
  -- Additional Info
  notes TEXT,
  cost_center_code VARCHAR(50),
  fixed_asset_account_code VARCHAR(50),
  depreciation_expense_account_code VARCHAR(50),
  accumulated_depreciation_account_code VARCHAR(50),
  
  -- Audit Fields
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (location_id) REFERENCES asset_locations(id) ON DELETE RESTRICT,
  
  CONSTRAINT assets_code_unique UNIQUE(code),
  CONSTRAINT assets_salvage_not_exceed_cost CHECK(salvage_value <= acquisition_cost),
  CONSTRAINT assets_cost_positive CHECK(acquisition_cost > 0),
  CONSTRAINT assets_useful_life_positive CHECK(useful_life_months > 0 OR asset_type IN ('NON_DEPRECIABLE', 'INTANGIBLE'))
);

-- Asset Depreciation Schedules Table
CREATE TABLE IF NOT EXISTS asset_depreciation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_month INTEGER NOT NULL,
  
  depreciation_amount NUMERIC(18,2) NOT NULL,
  accumulated_depreciation NUMERIC(18,2) NOT NULL,
  book_value NUMERIC(18,2) NOT NULL,
  
  -- Accounting Integration
  journal_entry_id UUID,
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE,
  
  CONSTRAINT asset_depreciation_schedules_unique_month UNIQUE(asset_id, period_month)
);

-- Asset Disposals Table
CREATE TABLE IF NOT EXISTS asset_disposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  
  disposal_type VARCHAR(50),
  -- Values: 'SOLD', 'SCRAPPED', 'DONATED', 'TRANSFERRED', 'OTHER'
  disposal_date DATE NOT NULL,
  
  -- Financial Details
  disposal_value NUMERIC(18,2),
  accumulated_depreciation_at_disposal NUMERIC(18,2),
  gain_or_loss NUMERIC(18,2),
  
  -- Transaction Details
  reference_type VARCHAR(50),
  reference_number VARCHAR(100),
  description TEXT,
  
  -- Audit
  approved_by UUID,
  approved_at TIMESTAMP,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE RESTRICT
);

-- Asset Attachments Table
CREATE TABLE IF NOT EXISTS asset_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  file_path VARCHAR(500) NOT NULL,
  
  attachment_type VARCHAR(50),
  -- Values: 'INVOICE', 'RECEIPT', 'PHOTO', 'WARRANTY', 'MANUAL', 'OTHER'
  
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
);

-- Asset Audit Logs Table
CREATE TABLE IF NOT EXISTS asset_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  
  action VARCHAR(50),
  -- Values: 'CREATED', 'UPDATED', 'ACTIVATED', 'DISPOSED', 'TRANSFERRED', 'STATUS_CHANGED'
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
);

-- Asset Transfers Table
CREATE TABLE IF NOT EXISTS asset_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  
  from_location_id UUID,
  to_location_id UUID,
  from_department_id UUID,
  to_department_id UUID,
  from_custodian_id UUID,
  to_custodian_id UUID,
  
  transfer_date DATE NOT NULL,
  reason TEXT,
  
  status VARCHAR(50),
  -- Values: 'PENDING', 'COMPLETED', 'REJECTED'
  approved_by UUID,
  approved_at TIMESTAMP,
  
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
);

-- Asset Maintenance Logs Table
CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  
  maintenance_type VARCHAR(50),
  -- Values: 'PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'
  maintenance_date DATE NOT NULL,
  
  description TEXT,
  cost NUMERIC(18,2),
  
  service_provider VARCHAR(200),
  parts_replaced TEXT,
  
  duration_hours NUMERIC(10,2),
  next_maintenance_date DATE,
  
  recorded_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (asset_id) REFERENCES fixed_assets(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_categories_name ON asset_categories(name);
CREATE INDEX IF NOT EXISTS idx_asset_categories_active ON asset_categories(is_active);
-- Asset Locations Indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_locations' AND column_name = 'code') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_locations_code ON asset_locations(code);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_locations' AND column_name = 'name') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_locations_name ON asset_locations(name);
  END IF;
END $$;

-- Fixed Assets Indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'serial_number') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_serial_unique ON fixed_assets(serial_number) WHERE serial_number IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'code') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_code ON fixed_assets(code);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'status') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_status ON fixed_assets(status);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_category ON fixed_assets(category_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'location_id') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_location ON fixed_assets(location_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'department_id') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_department ON fixed_assets(department_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_created_at ON fixed_assets(created_at);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'asset_type') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON fixed_assets(asset_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asset_depreciation_schedules_asset ON asset_depreciation_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_schedules_period ON asset_depreciation_schedules(period_start_date);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_schedules_posted ON asset_depreciation_schedules(is_posted);

CREATE INDEX IF NOT EXISTS idx_asset_disposals_asset ON asset_disposals(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_disposal_date ON asset_disposals(disposal_date);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_type ON asset_disposals(disposal_type);

-- Asset Attachments Indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_attachments' AND column_name = 'asset_id') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_attachments_asset ON asset_attachments(asset_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_attachments' AND column_name = 'file_type') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_attachments_type ON asset_attachments(file_type);
  END IF;
END $$;

-- Asset Audit Logs Indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_audit_logs' AND column_name = 'asset_id') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_audit_logs_asset ON asset_audit_logs(asset_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_audit_logs' AND column_name = 'action') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_audit_logs_action ON asset_audit_logs(action);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'asset_audit_logs' AND column_name = 'performed_at') THEN
    CREATE INDEX IF NOT EXISTS idx_asset_audit_logs_performed_at ON asset_audit_logs(performed_at);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asset_transfers_asset ON asset_transfers(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_transfers_status ON asset_transfers(status);
CREATE INDEX IF NOT EXISTS idx_asset_transfers_transfer_date ON asset_transfers(transfer_date);

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_asset ON asset_maintenance_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_maintenance_date ON asset_maintenance_logs(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_type ON asset_maintenance_logs(maintenance_type);

-- Composite Indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'status')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'category_id') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_composite_status_category ON fixed_assets(status, category_id) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'department_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'location_id') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_composite_department_location ON fixed_assets(department_id, location_id) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'custodian_user_id')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fixed_assets' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_assets_composite_custodian_active ON fixed_assets(custodian_user_id, is_active) WHERE deleted_at IS NULL;
  END IF;
END $$;
