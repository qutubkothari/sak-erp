-- Add function to get stock summary for an item
CREATE OR REPLACE FUNCTION get_item_stock_summary(
    p_item_id UUID,
    p_tenant_id UUID
)
RETURNS TABLE (
    total_quantity NUMERIC(15,2),
    available_quantity NUMERIC(15,2),
    allocated_quantity NUMERIC(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(se.quantity), 0) as total_quantity,
        COALESCE(SUM(se.available_quantity), 0) as available_quantity,
        COALESCE(SUM(se.allocated_quantity), 0) as allocated_quantity
    FROM stock_entries se
    WHERE se.item_id = p_item_id
      AND se.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;
