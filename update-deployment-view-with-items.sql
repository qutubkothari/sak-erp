-- Update v_uid_deployment_status view to include item information
-- Drop and recreate the view to change column structure
DROP VIEW IF EXISTS v_uid_deployment_status;

CREATE VIEW v_uid_deployment_status AS
SELECT 
  u.id as uid_id,
  u.uid,
  u.client_part_number,
  u.job_order_id,
  
  -- Item information (using entity_id and entity_type)
  i.name as item_name,
  i.code as item_code,
  
  -- Current location
  curr.id as current_deployment_id,
  curr.deployment_level as current_level,
  curr.organization_name as current_organization,
  curr.location_name as current_location,
  curr.deployment_date as current_deployment_date,
  
  -- Original customer
  first.organization_name as original_customer,
  first.deployment_date as first_deployment_date,
  
  -- Deployment count
  (SELECT COUNT(*) FROM product_deployment_history WHERE uid_id = u.id) as deployment_count,
  
  -- Warranty info
  curr.warranty_expiry_date,
  curr.contact_person,
  curr.contact_email,
  curr.contact_phone,
  
  u.tenant_id
FROM uid_registry u
LEFT JOIN items i ON u.entity_id = i.id AND u.entity_type = 'Item'
LEFT JOIN product_deployment_history curr 
  ON u.id = curr.uid_id AND curr.is_current_location = true
LEFT JOIN LATERAL (
  SELECT * FROM product_deployment_history 
  WHERE uid_id = u.id 
  ORDER BY deployment_date ASC, created_at ASC 
  LIMIT 1
) first ON true;
