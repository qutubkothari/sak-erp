-- ============================================
-- INVENTORY MANAGEMENT FUNCTIONS FOR JOB ORDERS
-- Run this in Supabase SQL Editor
-- ============================================

-- Function to consume inventory (decrease available quantity)
CREATE OR REPLACE FUNCTION consume_inventory(
  p_tenant_id UUID,
  p_item_id UUID,
  p_quantity DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_available DECIMAL;
BEGIN
  -- Get current available quantity
  SELECT available_quantity INTO v_available
  FROM inventory_stock
  WHERE tenant_id = p_tenant_id AND item_id = p_item_id;

  -- Check if enough stock available
  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Item not found in inventory';
  END IF;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Required: %', v_available, p_quantity;
  END IF;

  -- Update inventory
  UPDATE inventory_stock
  SET 
    available_quantity = available_quantity - p_quantity,
    reserved_quantity = COALESCE(reserved_quantity, 0) - p_quantity,
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND item_id = p_item_id;

END;
$$ LANGUAGE plpgsql;

-- Function to add to inventory (increase available quantity)
CREATE OR REPLACE FUNCTION add_to_inventory(
  p_tenant_id UUID,
  p_item_id UUID,
  p_quantity DECIMAL
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update inventory stock
  INSERT INTO inventory_stock (
    tenant_id,
    item_id,
    available_quantity,
    total_quantity,
    created_at,
    updated_at
  )
  VALUES (
    p_tenant_id,
    p_item_id,
    p_quantity,
    p_quantity,
    NOW(),
    NOW()
  )
  ON CONFLICT (tenant_id, item_id)
  DO UPDATE SET
    available_quantity = inventory_stock.available_quantity + p_quantity,
    total_quantity = inventory_stock.total_quantity + p_quantity,
    updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- Function to reserve inventory (when job order starts)
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_tenant_id UUID,
  p_item_id UUID,
  p_quantity DECIMAL
)
RETURNS VOID AS $$
DECLARE
  v_available DECIMAL;
BEGIN
  -- Get current available quantity
  SELECT available_quantity INTO v_available
  FROM inventory_stock
  WHERE tenant_id = p_tenant_id AND item_id = p_item_id;

  -- Check if enough stock available
  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Item % not found in inventory', p_item_id;
  END IF;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock for item %. Available: %, Required: %', p_item_id, v_available, p_quantity;
  END IF;

  -- Reserve inventory
  UPDATE inventory_stock
  SET 
    available_quantity = available_quantity - p_quantity,
    reserved_quantity = COALESCE(reserved_quantity, 0) + p_quantity,
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND item_id = p_item_id;

END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT '✅ INVENTORY FUNCTIONS CREATED SUCCESSFULLY!' as result;
