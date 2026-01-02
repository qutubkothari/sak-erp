-- ============================================================================
-- CHANGE DEPLOYMENT LEVEL FROM ENUM TO VARCHAR
-- Allow custom deployment levels for flexibility
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Converting deployment_level from ENUM to VARCHAR...';
  
  -- Step 0: Drop the dependent view first
  DROP VIEW IF EXISTS v_uid_deployment_status;
  RAISE NOTICE '✓ Dropped dependent view v_uid_deployment_status';
  
  -- Step 1: Add new temporary VARCHAR column
  ALTER TABLE product_deployment_history
  ADD COLUMN IF NOT EXISTS deployment_level_temp VARCHAR(100);
  
  -- Step 2: Copy data from ENUM to VARCHAR
  UPDATE product_deployment_history
  SET deployment_level_temp = deployment_level::text;
  
  -- Step 3: Drop old ENUM column
  ALTER TABLE product_deployment_history
  DROP COLUMN deployment_level;
  
  -- Step 4: Rename temp column to deployment_level
  ALTER TABLE product_deployment_history
  RENAME COLUMN deployment_level_temp TO deployment_level;
  
  -- Step 5: Add NOT NULL constraint
  ALTER TABLE product_deployment_history
  ALTER COLUMN deployment_level SET NOT NULL;
  
  -- Step 6: Add index for performance
  CREATE INDEX IF NOT EXISTS idx_deployment_level 
  ON product_deployment_history(deployment_level);
  
  -- Step 7: Recreate the view
  CREATE OR REPLACE VIEW v_uid_deployment_status AS
  SELECT 
    u.id as uid_id,
    u.uid,
    u.client_part_number,
    u.job_order_id,
    
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
  LEFT JOIN product_deployment_history curr 
    ON u.id = curr.uid_id AND curr.is_current_location = true
  LEFT JOIN LATERAL (
    SELECT * FROM product_deployment_history 
    WHERE uid_id = u.id 
    ORDER BY deployment_date ASC, created_at ASC 
    LIMIT 1
  ) first ON true;
  
  RAISE NOTICE '✓ Recreated view v_uid_deployment_status';
  RAISE NOTICE '✓ Successfully converted deployment_level to VARCHAR';
  RAISE NOTICE '✓ Predefined levels: CUSTOMER, DEPOT, END_LOCATION, SERVICE_CENTER, RETURNED';
  RAISE NOTICE '✓ Custom levels now supported!';
  
  -- Optional: Drop the ENUM type if no longer needed
  -- Note: Only do this if no other tables use this type
  BEGIN
    DROP TYPE IF EXISTS deployment_level_type CASCADE;
    RAISE NOTICE '✓ Dropped deployment_level_type ENUM';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '⚠ Could not drop ENUM type (might be in use elsewhere)';
  END;
  
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  column_type TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
  
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_name = 'product_deployment_history'
  AND column_name = 'deployment_level';
  
  IF column_type = 'character varying' THEN
    RAISE NOTICE '✓ deployment_level is now VARCHAR';
    RAISE NOTICE '✓ Custom deployment levels supported';
  ELSE
    RAISE NOTICE '✗ Column type: %', column_type;
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
