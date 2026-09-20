-- Check existing enum types and their values
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%movement%' OR t.typname LIKE '%stock%'
ORDER BY t.typname, e.enumsortorder;

-- Also check the stock_movements table if it already exists
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
AND table_schema = 'public'
ORDER BY ordinal_position;