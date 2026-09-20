-- Get ALL inventory-related table schemas at once
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN (
  'grns',
  'grn_items',
  'stock_entries',
  'inventory_stock',
  'inventory_transactions',
  'stock_movements',
  'uid_registry',
  'warehouses',
  'items'
)
ORDER BY table_name, ordinal_position;
