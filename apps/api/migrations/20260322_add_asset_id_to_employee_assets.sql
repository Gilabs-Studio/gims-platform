-- Migration: Add asset_id to employee_assets for Finance Assets integration
-- Date: 2026-03-22

-- Add asset_id column to employee_assets table
ALTER TABLE IF EXISTS employee_assets
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES fixed_assets(id) ON DELETE SET NULL;

-- Add index for asset_id
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'employee_assets'
			AND column_name = 'asset_id'
	) THEN
		CREATE INDEX IF NOT EXISTS idx_employee_assets_asset_id ON employee_assets(asset_id);
	END IF;
END $$;

-- Migration completed successfully
