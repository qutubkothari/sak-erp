-- Sync GRN Payment Status based on PO Advances (LIVE DATABASE)
-- Run this on LIVE Supabase SQL Editor
-- This will mark GRNs as PAID if PO advance covers the full invoice amount

-- Preview: See which GRNs will be updated
SELECT 
    g.grn_number,
    g.net_payable_amount,
    g.paid_amount,
    g.tds_amount,
    g.short_payment_amount,
    g.payment_status,
    COALESCE(
        (SELECT SUM(amount) FROM po_advance_payments WHERE po_id = g.po_id AND tenant_id = g.tenant_id),
        0
    ) as po_advance,
    (
        COALESCE(g.paid_amount, 0) + 
        COALESCE(g.tds_amount, 0) + 
        COALESCE(g.short_payment_amount, 0) +
        COALESCE(
            (SELECT SUM(amount) FROM po_advance_payments WHERE po_id = g.po_id AND tenant_id = g.tenant_id),
            0
        )
    ) as total_settled,
    'WILL_BE_UPDATED_TO_PAID' as action
FROM grns g
WHERE g.po_id IS NOT NULL
AND g.payment_status != 'PAID'
AND (
    COALESCE(g.paid_amount, 0) + 
    COALESCE(g.tds_amount, 0) + 
    COALESCE(g.short_payment_amount, 0) +
    COALESCE(
        (SELECT SUM(amount) FROM po_advance_payments WHERE po_id = g.po_id AND tenant_id = g.tenant_id),
        0
    )
) >= COALESCE(g.net_payable_amount, 0) - 0.01;

-- If the above preview looks correct, run the UPDATE below:
/*
UPDATE grns g
SET 
    payment_status = 'PAID', 
    updated_at = NOW()
WHERE g.po_id IS NOT NULL
AND g.payment_status != 'PAID'
AND (
    COALESCE(g.paid_amount, 0) + 
    COALESCE(g.tds_amount, 0) + 
    COALESCE(g.short_payment_amount, 0) +
    COALESCE(
        (SELECT SUM(amount) FROM po_advance_payments p WHERE p.po_id = g.po_id AND p.tenant_id = g.tenant_id),
        0
    )
) >= COALESCE(g.net_payable_amount, 0) - 0.01;

-- Verify update
SELECT 
    payment_status, 
    COUNT(*) as count 
FROM grns 
WHERE po_id IS NOT NULL
GROUP BY payment_status;
*/
