-- Change asset_type_id to string enum storage
-- Date: 2026-05-09

ALTER TABLE fixed_assets
ALTER COLUMN asset_type_id TYPE VARCHAR(20)
USING asset_type_id::text;
