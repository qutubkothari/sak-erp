-- Check actual column names in stock_entries table
-- Run this on PMSTEST to see real column names

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_entries'
ORDER BY ordinal_position;

-- Also check items table columns
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'items'
ORDER BY ordinal_position;
