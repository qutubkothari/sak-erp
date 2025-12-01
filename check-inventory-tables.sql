-- Check if inventory-related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'stock_movements',
  'inventory_alerts', 
  'demo_inventory',
  'stock_entries',
  'stock_levels'
)
ORDER BY table_name;

-- Also check for columns in stock_entries to see the structure
SELECT 'STOCK_ENTRIES columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_entries' AND table_schema = 'public'
ORDER BY ordinal_position;