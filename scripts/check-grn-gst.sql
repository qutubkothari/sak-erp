-- Check GRN GST data for vendors with GST issues
-- Run this on LIVE database

-- Find GRNs for Jamal Bapu and V Hari Babu
SELECT 
    g.grn_number,
    g.gst_percentage,
    g.gross_amount,
    g.tax_amount,
    g.net_payable_amount,
    g.po_id,
    v.name as vendor_name,
    v.code as vendor_code
FROM grns g
JOIN vendors v ON g.vendor_id = v.id
WHERE v.name ILIKE '%jamal%' 
   OR v.name ILIKE '%hari babu%'
   OR v.code IN ('VEND10', 'VEND18')
ORDER BY g.created_at DESC
LIMIT 20;

-- Also check their PO items tax percent
SELECT 
    po.po_number,
    v.name as vendor_name,
    poi.item_name,
    poi.tax_percent,
    poi.rate as unit_price,
    poi.ordered_qty as quantity
FROM purchase_orders po
JOIN vendors v ON po.vendor_id = v.id
JOIN purchase_order_items poi ON po.id = poi.po_id
WHERE v.name ILIKE '%jamal%' 
   OR v.name ILIKE '%hari babu%'
   OR v.code IN ('VEND10', 'VEND18')
ORDER BY po.created_at DESC
LIMIT 20;
