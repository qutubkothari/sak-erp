-- Fix: Recalculate inventory_stock from stock_entries
-- This restores stock data when inventory_stock table is out of sync

-- Step 1: Clear existing inventory_stock data (optional - if you want to completely rebuild)
-- DELETE FROM inventory_stock WHERE tenant_id = 'your-tenant-id';

-- Step 2: Recalculate inventory_stock from stock_entries
-- Sum up available_quantity per item per warehouse
INSERT INTO inventory_stock (tenant_id, item_id, warehouse_id, quantity, available_quantity, allocated_quantity, updated_at)
SELECT 
    tenant_id,
    item_id,
    warehouse_id,
    SUM(quantity) as quantity,
    SUM(available_quantity) as available_quantity,
    SUM(quantity - available_quantity) as allocated_quantity,
    NOW() as updated_at
FROM stock_entries
WHERE available_quantity > 0 OR quantity > 0
GROUP BY tenant_id, item_id, warehouse_id
ON CONFLICT (tenant_id, item_id, warehouse_id) 
DO UPDATE SET
    quantity = EXCLUDED.quantity,
    available_quantity = EXCLUDED.available_quantity,
    allocated_quantity = EXCLUDED.allocated_quantity,
    updated_at = NOW();

-- Verify the fix
SELECT 
    i.name as item_name,
    i.code as item_code,
    inv.quantity,
    inv.available_quantity,
    w.name as warehouse_name
FROM inventory_stock inv
JOIN items i ON inv.item_id = i.id
LEFT JOIN warehouses w ON inv.warehouse_id = w.id
WHERE inv.available_quantity > 0
ORDER BY inv.available_quantity DESC
LIMIT 20;
