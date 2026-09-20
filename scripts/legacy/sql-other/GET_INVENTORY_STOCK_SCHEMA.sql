-- Get schema for inventory_stock table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'inventory_stock'
ORDER BY ordinal_position;
