-- Test Debit Note Flow - Run these queries after QC Accept with rejections

-- 1. Check GRN financial amounts
SELECT 
    grn_number,
    status,
    qc_completed,
    gross_amount,
    debit_note_amount,
    net_payable_amount,
    (gross_amount - debit_note_amount) as calculated_net
FROM grns
WHERE qc_completed = true
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check GRN items with rejections
SELECT 
    gi.id,
    i.item_code,
    i.item_name,
    gi.received_qty,
    gi.accepted_qty,
    gi.rejected_qty,
    gi.unit_price,
    gi.rejection_amount,
    gi.qc_status,
    gi.return_status,
    gi.rejection_reason,
    gi.debit_note_id
FROM grn_items gi
JOIN items i ON gi.item_id = i.id
WHERE gi.rejected_qty > 0
ORDER BY gi.created_at DESC
LIMIT 10;

-- 3. Check debit notes created
SELECT 
    dn.debit_note_number,
    dn.debit_note_date,
    dn.total_amount,
    dn.status,
    dn.reason,
    g.grn_number,
    v.vendor_name,
    u.name as created_by_name
FROM debit_notes dn
JOIN grns g ON dn.grn_id = g.id
JOIN vendors v ON dn.vendor_id = v.id
JOIN users u ON dn.created_by = u.id
ORDER BY dn.created_at DESC
LIMIT 5;

-- 4. Check debit note line items
SELECT 
    dni.id,
    dn.debit_note_number,
    i.item_code,
    i.item_name,
    dni.rejected_qty,
    dni.unit_price,
    dni.amount,
    dni.rejection_reason,
    dni.return_status
FROM debit_note_items dni
JOIN debit_notes dn ON dni.debit_note_id = dn.id
JOIN items i ON dni.item_id = i.id
ORDER BY dni.created_at DESC
LIMIT 10;

-- 5. Complete flow verification for a specific GRN
-- Replace 'GRN-2025-12-XXX' with your actual GRN number
SELECT 
    'GRN Details' as section,
    g.grn_number,
    g.status,
    g.qc_completed,
    g.gross_amount,
    g.debit_note_amount,
    g.net_payable_amount
FROM grns g
WHERE g.grn_number = 'GRN-2025-12-XXX'

UNION ALL

SELECT 
    'GRN Items' as section,
    i.item_code,
    gi.qc_status,
    gi.received_qty::text,
    gi.accepted_qty::text,
    gi.rejected_qty::text,
    gi.rejection_amount::text
FROM grn_items gi
JOIN items i ON gi.item_id = i.id
WHERE gi.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-XXX')

UNION ALL

SELECT 
    'Debit Note' as section,
    dn.debit_note_number,
    dn.status,
    dn.total_amount::text,
    NULL,
    NULL,
    NULL
FROM debit_notes dn
WHERE dn.grn_id = (SELECT id FROM grns WHERE grn_number = 'GRN-2025-12-XXX');

-- 6. Stock verification - ensure only accepted qty went to stock
SELECT 
    se.item_id,
    i.item_code,
    i.item_name,
    se.transaction_type,
    se.quantity_in,
    se.available_quantity,
    se.reference_type,
    se.reference_id
FROM stock_entries se
JOIN items i ON se.item_id = i.id
WHERE se.reference_type = 'GRN'
AND se.reference_id IN (
    SELECT id FROM grns WHERE qc_completed = true
)
ORDER BY se.created_at DESC
LIMIT 10;
