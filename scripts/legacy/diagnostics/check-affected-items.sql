-- Check GRN items for the three affected item codes
SELECT 
    gi.id as grn_item_id,
    g.grn_number,
    gi.item_code,
    gi.item_id,
    gi.accepted_qty,
    gi.rate,
    gi.po_item_id
FROM grn_items gi
JOIN grns g ON gi.grn_id = g.id
WHERE gi.item_code IN ('DIO-SMD-PNJM7', 'SIC-REG-AMS1117-33v', 'SIC-REG-AMS1117-5v')
ORDER BY g.grn_number, gi.item_code;

-- Check their stock entries
SELECT 
    se.id,
    se.metadata->>'grn_reference' as grn_reference,
    i.code as item_code,
    se.quantity,
    se.available_quantity,
    se.unit_price,
    se.created_at,
    se.updated_at
FROM stock_entries se
LEFT JOIN items i ON se.item_id = i.id
WHERE i.code IN ('DIO-SMD-PNJM7', 'SIC-REG-AMS1117-33v', 'SIC-REG-AMS1117-5v')
   OR se.metadata->>'item_code' IN ('DIO-SMD-PNJM7', 'SIC-REG-AMS1117-33v', 'SIC-REG-AMS1117-5v')
ORDER BY se.metadata->>'grn_reference', i.code;

-- Check current inventory stock
SELECT 
    inv.item_id,
    i.code as item_code,
    inv.quantity,
    inv.available_quantity,
    inv.warehouse_id,
    inv.location_id
FROM inventory_stock inv
JOIN items i ON inv.item_id = i.id
WHERE i.code IN ('DIO-SMD-PNJM7', 'SIC-REG-AMS1117-33v', 'SIC-REG-AMS1117-5v')
ORDER BY i.code;
