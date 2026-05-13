-- Change asset_type_id to string enum storage
-- Date: 2026-05-09

DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'fixed_assets'
			AND column_name = 'asset_type_id'
			AND data_type <> 'character varying'
	) THEN
		ALTER TABLE fixed_assets
		ALTER COLUMN asset_type_id TYPE VARCHAR(20)
		USING asset_type_id::text;
	END IF;
END $$;
