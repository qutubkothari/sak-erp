-- ============================================================================
-- GET PURCHASE PRICE HISTORY FOR ITEM-VENDOR
-- Purpose: Returns last 3 purchase prices for an item from a specific vendor
-- ============================================================================

CREATE OR REPLACE FUNCTION get_purchase_price_history(
    p_item_id UUID,
    p_vendor_id UUID
)
RETURNS TABLE (
    po_number VARCHAR(50),
    po_date DATE,
    unit_price NUMERIC(15,2),
    quantity NUMERIC(15,2),
    po_status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        po.po_number,
        po.po_date,
        poi.unit_price,
        poi.quantity,
        po.status as po_status
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.item_id = p_item_id
      AND po.vendor_id = p_vendor_id
      AND po.status IN ('approved', 'completed', 'partially_received')
    ORDER BY po.po_date DESC, po.created_at DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_purchase_price_history IS 'Returns last 3 purchase prices for an item from a specific vendor';

-- Test query (optional - comment out in production)
-- SELECT * FROM get_purchase_price_history(
--     '00000000-0000-0000-0000-000000000000'::UUID,
--     '00000000-0000-0000-0000-000000000000'::UUID
-- );
