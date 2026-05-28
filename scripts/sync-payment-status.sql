-- Sync GRN payment status based on PO advances
-- Marks GRNs as PAID if PO advance covers the full invoice amount

-- First, let's see what will be updated
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
    (
        COALESCE(g.net_payable_amount, 0) - 
        COALESCE(g.paid_amount, 0) - 
        COALESCE(g.tds_amount, 0) - 
        COALESCE(g.short_payment_amount, 0) -
        COALESCE(
            (SELECT SUM(amount) FROM po_advance_payments WHERE po_id = g.po_id AND tenant_id = g.tenant_id),
            0
        )
    ) as outstanding
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

-- If the above query shows the correct GRNs, run the update below:
/*
UPDATE grns g
SET payment_status = 'PAID', updated_at = NOW()
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
*/
