-- Drop redundant name column from pos_floor_plans table.
-- Floor plan title is now dynamically resolved from the associated outlet name.
ALTER TABLE IF EXISTS pos_floor_plans
    DROP COLUMN IF EXISTS name;
