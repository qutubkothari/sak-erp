-- Get schema of stock_entries table to see actual columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_entries'
ORDER BY ordinal_position;
