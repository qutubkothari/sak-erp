-- Check stock entries for all items
SELECT 
  i.code,
  i.name,
  se.available_quantity,
  se.total_quantity,
  se.allocated_quantity,
  se.created_at,
  se.updated_at
FROM stock_entries se
JOIN items i ON i.id = se.item_id
WHERE se.available_quantity > 0
ORDER BY i.code, se.created_at;

-- Check recent job orders and their materials
SELECT 
  jo.job_order_number,
  jo.status,
  jo.created_at,
  jom.item_code,
  jom.required_quantity,
  jom.issued_quantity,
  jom.status as material_status
FROM production_job_orders jo
LEFT JOIN job_order_materials jom ON jom.job_order_id = jo.id
WHERE jo.created_at > NOW() - INTERVAL '1 hour'
ORDER BY jo.created_at DESC, jom.item_code;
