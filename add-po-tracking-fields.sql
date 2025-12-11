-- Add tracking fields to purchase orders
-- Enables tracking of shipment details and delivery status

-- Add tracking columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipped_date DATE,
ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'PENDING';

-- Add comments
COMMENT ON COLUMN purchase_orders.tracking_number IS 'Shipment tracking number from carrier';
COMMENT ON COLUMN purchase_orders.shipped_date IS 'Date when items were shipped by vendor';
COMMENT ON COLUMN purchase_orders.estimated_delivery_date IS 'Expected delivery date';
COMMENT ON COLUMN purchase_orders.actual_delivery_date IS 'Actual date of delivery';
COMMENT ON COLUMN purchase_orders.carrier_name IS 'Shipping carrier/courier company';
COMMENT ON COLUMN purchase_orders.tracking_url IS 'URL to track shipment online';
COMMENT ON COLUMN purchase_orders.delivery_status IS 'PENDING, SHIPPED, IN_TRANSIT, DELIVERED, DELAYED';

-- Create index for tracking queries
CREATE INDEX IF NOT EXISTS idx_po_tracking_number ON purchase_orders(tracking_number) WHERE tracking_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_po_delivery_status ON purchase_orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_po_estimated_delivery ON purchase_orders(estimated_delivery_date) WHERE estimated_delivery_date IS NOT NULL;

-- Create view for overdue purchase orders
CREATE OR REPLACE VIEW v_overdue_purchase_orders AS
SELECT 
  po.id,
  po.po_number,
  po.po_date,
  po.delivery_date,
  po.estimated_delivery_date,
  po.delivery_status,
  po.status,
  v.id as vendor_id,
  v.name as vendor_name,
  v.contact_person,
  v.email as vendor_email,
  v.phone as vendor_phone,
  po.total_amount,
  CURRENT_DATE - COALESCE(po.estimated_delivery_date, po.delivery_date) as days_overdue
FROM purchase_orders po
JOIN vendors v ON po.vendor_id = v.id
WHERE po.status IN ('APPROVED', 'COMPLETED')
  AND po.delivery_status != 'DELIVERED'
  AND COALESCE(po.estimated_delivery_date, po.delivery_date) < CURRENT_DATE
ORDER BY days_overdue DESC;

COMMENT ON VIEW v_overdue_purchase_orders IS 'Purchase orders past their delivery date';

-- Create function to get upcoming deliveries
CREATE OR REPLACE FUNCTION get_upcoming_deliveries(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  po_id UUID,
  po_number VARCHAR(50),
  vendor_name VARCHAR(200),
  estimated_delivery DATE,
  days_until_delivery INTEGER,
  total_amount NUMERIC(15,2),
  delivery_status VARCHAR(50)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.id as po_id,
    po.po_number,
    v.name as vendor_name,
    COALESCE(po.estimated_delivery_date, po.delivery_date) as estimated_delivery,
    (COALESCE(po.estimated_delivery_date, po.delivery_date) - CURRENT_DATE)::INTEGER as days_until_delivery,
    po.total_amount,
    po.delivery_status
  FROM purchase_orders po
  JOIN vendors v ON po.vendor_id = v.id
  WHERE po.status IN ('APPROVED', 'COMPLETED')
    AND po.delivery_status != 'DELIVERED'
    AND COALESCE(po.estimated_delivery_date, po.delivery_date) BETWEEN CURRENT_DATE AND CURRENT_DATE + days_ahead
  ORDER BY estimated_delivery ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_upcoming_deliveries IS 'Returns POs with deliveries expected within specified days';
