-- Check if stock is tracked in a different table

-- Check stock_entries table (old table?)
SELECT 
    'stock_entries table' as source,
    i.code,
    se.*
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE i.code IN ('DIO-SMD-PNJM7', 'RAD-TRR-QX71W915', 'RAD-TRR-R9MI1W915')
ORDER BY i.code, se.created_at;

-- Check if there are any inventory transactions
SELECT 
    'inventory_transactions' as source,
    i.code,
    it.*
FROM inventory_transactions it
JOIN items i ON it.item_id = i.id
WHERE i.code IN ('DIO-SMD-PNJM7', 'RAD-TRR-QX71W915', 'RAD-TRR-R9MI1W915')
ORDER BY i.code, it.created_at;
