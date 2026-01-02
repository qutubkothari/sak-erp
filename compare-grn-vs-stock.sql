-- Compare GRN accepted quantities vs stock entries for the three items
SELECT 
    g.grn_number,
    gi.item_code,
    gi.item_id,
    gi.accepted_qty as grn_accepted_qty,
    se.quantity as stock_quantity,
    CASE 
        WHEN gi.accepted_qty = se.quantity THEN '✓ MATCH'
        ELSE '✗ MISMATCH'
    END as status,
    se.id as stock_entry_id
FROM grn_items gi
JOIN grns g ON gi.grn_id = g.id
LEFT JOIN stock_entries se ON se.item_id = gi.item_id 
    AND se.metadata->>'grn_reference' = g.grn_number
WHERE gi.item_code IN ('DIO-SMD-PNJM7', 'SIC-REG-AMS1117-33v', 'SIC-REG-AMS1117-5v')
ORDER BY g.grn_number, gi.item_code;
