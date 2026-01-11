-- Update all stock to 53 (both tables)
-- Run this to sync inventory_stock and stock_entries to 53

BEGIN;

-- Update inventory_stock to 53
-- NOTE: available_quantity is a GENERATED column (quantity - reserved_quantity)
-- So we only update quantity and reserved_quantity, available_quantity will auto-calculate
UPDATE inventory_stock
SET 
  quantity = 53.00,
  reserved_quantity = 0.00,
  updated_at = NOW()
WHERE quantity = 50.00;

-- Update stock_entries to 53 (this is what Items page reads)
UPDATE stock_entries
SET 
  quantity = 53.00,
  available_quantity = 53.00,
  updated_at = NOW()
WHERE quantity = 50.00 OR available_quantity = 50.00;

COMMIT;

-- Verify the update
SELECT 'inventory_stock' AS table_name, COUNT(*) AS rows_with_53 
FROM inventory_stock 
WHERE quantity = 53.00
UNION ALL
SELECT 'stock_entries', COUNT(*) 
FROM stock_entries 
WHERE available_quantity = 53.00;
