-- Check ALL FK constraints on fixed_assets table
SELECT 
    constraint_name,
    table_name,
    column_name,
    referenced_table_name,
    referenced_column_name
FROM information_schema.referential_constraints
WHERE table_name = 'fixed_assets'
ORDER BY constraint_name;

-- Alternative view - all table constraints
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_name = 'fixed_assets'
ORDER BY constraint_name;

-- Get actual FK definitions from pg_constraint
SELECT 
    c.conname as constraint_name,
    a.attname as column_name,
    t.relname as foreign_table_name
FROM pg_constraint c
JOIN pg_class r ON c.conrelid = r.oid
JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum = ANY(c.conkey)
JOIN pg_class t ON c.confrelid = t.oid
WHERE r.relname = 'fixed_assets'
  AND c.contype = 'f'
ORDER BY c.conname;
