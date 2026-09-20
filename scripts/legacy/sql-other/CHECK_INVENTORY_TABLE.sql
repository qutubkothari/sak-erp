-- Check if inventory table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('inventory', 'inventory_movements', 'inventory_stock');

-- Check all tables with 'inventory' in name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%inventory%';
