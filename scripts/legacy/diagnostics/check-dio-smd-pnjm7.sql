-- Check DIO-SMD-PNJM7 stock situation

-- 1. Check GRNs for this item
SELECT 
    'GRN History' as source,
    g.grn_number,
    g.status,
    gi.accepted_qty,
    gi.uid_count,
    gi.uid_generated,
    g.created_at
FROM grns g
JOIN grn_items gi ON g.id = gi.grn_id
JOIN items i ON gi.item_id = i.id
WHERE i.code = 'DIO-SMD-PNJM7'
ORDER BY g.created_at DESC;

-- 2. Check UIDs generated
SELECT 
    'UIDs Generated' as source,
    COUNT(*) as uid_count,
    ur.grn_id,
    g.grn_number
FROM uid_registry ur
JOIN items i ON ur.entity_id = i.id
LEFT JOIN grns g ON ur.grn_id = g.id
WHERE i.code = 'DIO-SMD-PNJM7'
GROUP BY ur.grn_id, g.grn_number;

-- 3. Check stock_entries
SELECT 
    'stock_entries' as source,
    se.*
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE i.code = 'DIO-SMD-PNJM7'
ORDER BY se.created_at;

-- 4. Check inventory_transactions
SELECT 
    'inventory_transactions' as source,
    it.*
FROM inventory_transactions it
JOIN items i ON it.item_id = i.id
WHERE i.code = 'DIO-SMD-PNJM7'
ORDER BY it.created_at;

-- 5. Check inventory_stock
SELECT 
    'inventory_stock' as source,
    ist.*
FROM inventory_stock ist
JOIN items i ON ist.item_id = i.id
WHERE i.code = 'DIO-SMD-PNJM7';
