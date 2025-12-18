-- ============================================================================
-- UID PART NUMBER TAGGING & PRODUCT DEPLOYMENT TRACKING
-- Feature 1: Tag UIDs with client part numbers
-- Feature 2: Track product deployment through distribution chain
-- ============================================================================

-- PART 1: Add client_part_number to uid_registry
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Adding client_part_number column to uid_registry...';
  
  ALTER TABLE uid_registry
  ADD COLUMN IF NOT EXISTS client_part_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS part_number_assigned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS part_number_assigned_by UUID REFERENCES users(id);
  
  -- Index for faster searches by part number
  CREATE INDEX IF NOT EXISTS idx_uid_registry_client_part_number 
  ON uid_registry(client_part_number) 
  WHERE client_part_number IS NOT NULL;
  
  RAISE NOTICE '✓ Added client_part_number fields to uid_registry';
END $$;

-- PART 2: Create product_deployment_history table
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Creating product_deployment_history table...';
  
  -- Create deployment level enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deployment_level_type') THEN
    CREATE TYPE deployment_level_type AS ENUM (
      'CUSTOMER',           -- Initial customer (e.g., Indian Navy)
      'DEPOT',              -- Intermediate depot/warehouse
      'END_LOCATION',       -- Final deployment location (e.g., INS Vikrant)
      'SERVICE_CENTER',     -- Service/repair center
      'RETURNED'            -- Returned to manufacturer
    );
    RAISE NOTICE '✓ Created deployment_level_type enum';
  END IF;
  
  -- Create deployment history table
  CREATE TABLE IF NOT EXISTS product_deployment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    uid_id UUID NOT NULL REFERENCES uid_registry(id),
    
    -- Deployment details
    deployment_level deployment_level_type NOT NULL,
    organization_name VARCHAR(255) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    deployment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Hierarchy tracking
    parent_deployment_id UUID REFERENCES product_deployment_history(id),
    
    -- Current location flag
    is_current_location BOOLEAN DEFAULT true,
    
    -- Contact and notes
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    deployment_notes TEXT,
    
    -- Warranty info
    warranty_expiry_date DATE,
    maintenance_schedule VARCHAR(100),
    
    -- Audit fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Public access token for warranty portal
    public_access_token VARCHAR(100) UNIQUE,
    
    CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
  );
  
  RAISE NOTICE '✓ Created product_deployment_history table';
END $$;

-- PART 3: Create indexes for performance
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Creating indexes...';
  
  CREATE INDEX IF NOT EXISTS idx_deployment_uid 
  ON product_deployment_history(uid_id);
  
  CREATE INDEX IF NOT EXISTS idx_deployment_tenant 
  ON product_deployment_history(tenant_id);
  
  CREATE INDEX IF NOT EXISTS idx_deployment_current 
  ON product_deployment_history(uid_id, is_current_location) 
  WHERE is_current_location = true;
  
  CREATE INDEX IF NOT EXISTS idx_deployment_organization 
  ON product_deployment_history(organization_name);
  
  CREATE INDEX IF NOT EXISTS idx_deployment_location 
  ON product_deployment_history(location_name);
  
  CREATE INDEX IF NOT EXISTS idx_deployment_public_token 
  ON product_deployment_history(public_access_token) 
  WHERE public_access_token IS NOT NULL;
  
  RAISE NOTICE '✓ Created indexes';
END $$;

-- PART 4: Create trigger to update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_deployment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deployment_updated_at ON product_deployment_history;
CREATE TRIGGER trigger_deployment_updated_at
  BEFORE UPDATE ON product_deployment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_deployment_timestamp();

-- PART 5: Create function to update current location
-- ============================================================================
CREATE OR REPLACE FUNCTION update_uid_current_location()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new deployment is marked as current, unmark all previous deployments
  IF NEW.is_current_location = true THEN
    UPDATE product_deployment_history
    SET is_current_location = false
    WHERE uid_id = NEW.uid_id
      AND id != NEW.id
      AND is_current_location = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_current_location ON product_deployment_history;
CREATE TRIGGER trigger_update_current_location
  BEFORE INSERT OR UPDATE ON product_deployment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_uid_current_location();

-- PART 6: Create view for easy querying
-- ============================================================================
CREATE OR REPLACE VIEW v_uid_deployment_status AS
SELECT 
  u.id as uid_id,
  u.uid,
  u.client_part_number,
  u.item_id,
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
LEFT JOIN items i ON u.item_id = i.id
LEFT JOIN product_deployment_history curr 
  ON u.id = curr.uid_id AND curr.is_current_location = true
LEFT JOIN LATERAL (
  SELECT * FROM product_deployment_history 
  WHERE uid_id = u.id 
  ORDER BY deployment_date ASC, created_at ASC 
  LIMIT 1
) first ON true;

-- PART 7: Create function to generate public access token
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_deployment_access_token()
RETURNS VARCHAR(100) AS $$
BEGIN
  RETURN 'WRT-' || UPPER(SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 16));
END;
$$ LANGUAGE plpgsql;

-- PART 8: Sample data comments
-- ============================================================================
COMMENT ON TABLE product_deployment_history IS 'Tracks product deployment through distribution channels for warranty and maintenance';
COMMENT ON COLUMN product_deployment_history.deployment_level IS 'CUSTOMER, DEPOT, END_LOCATION, SERVICE_CENTER, RETURNED';
COMMENT ON COLUMN product_deployment_history.parent_deployment_id IS 'Links to parent deployment in the chain (e.g., Depot links to Customer)';
COMMENT ON COLUMN product_deployment_history.is_current_location IS 'Only one deployment per UID should be marked as current';
COMMENT ON COLUMN product_deployment_history.public_access_token IS 'Token for public warranty portal access';
COMMENT ON COLUMN uid_registry.client_part_number IS 'Client-assigned part number for the UID (e.g., 53022)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  uid_column_exists BOOLEAN;
  deployment_table_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  
  -- Check uid_registry columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'uid_registry' 
    AND column_name = 'client_part_number'
  ) INTO uid_column_exists;
  
  -- Check deployment table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'product_deployment_history'
  ) INTO deployment_table_exists;
  
  -- Check view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'v_uid_deployment_status'
  ) INTO view_exists;
  
  IF uid_column_exists THEN
    RAISE NOTICE '✓ UID Registry: client_part_number column added';
  ELSE
    RAISE NOTICE '✗ UID Registry: client_part_number column MISSING';
  END IF;
  
  IF deployment_table_exists THEN
    RAISE NOTICE '✓ Deployment History: Table created';
  ELSE
    RAISE NOTICE '✗ Deployment History: Table MISSING';
  END IF;
  
  IF view_exists THEN
    RAISE NOTICE '✓ Deployment Status View: Created';
  ELSE
    RAISE NOTICE '✗ Deployment Status View: MISSING';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Features Ready:';
  RAISE NOTICE '1. UID Part Number Tagging';
  RAISE NOTICE '2. Product Deployment Chain Tracking';
  RAISE NOTICE '3. Warranty Portal (Public Access)';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Tag UID with client part number
-- UPDATE uid_registry 
-- SET 
--   client_part_number = '53022',
--   part_number_assigned_at = NOW(),
--   part_number_assigned_by = 'user-uuid'
-- WHERE uid = 'UID-1001';

-- Example 2: Record initial deployment to customer
-- INSERT INTO product_deployment_history (
--   tenant_id, uid_id, deployment_level, organization_name, location_name,
--   contact_person, contact_email, warranty_expiry_date, public_access_token
-- ) VALUES (
--   'tenant-uuid', 'uid-uuid', 'CUSTOMER', 'Indian Navy', 'Naval Headquarters Mumbai',
--   'Cdr. Rajesh Kumar', 'rajesh.kumar@indiannavy.in', '2027-12-31',
--   generate_deployment_access_token()
-- );

-- Example 3: Record depot transfer
-- INSERT INTO product_deployment_history (
--   tenant_id, uid_id, deployment_level, organization_name, location_name,
--   parent_deployment_id, public_access_token
-- ) VALUES (
--   'tenant-uuid', 'uid-uuid', 'DEPOT', 'Indian Navy', 'Porbandar Depot',
--   'parent-deployment-uuid', generate_deployment_access_token()
-- );

-- Example 4: Record final deployment to ship
-- INSERT INTO product_deployment_history (
--   tenant_id, uid_id, deployment_level, organization_name, location_name,
--   parent_deployment_id, public_access_token
-- ) VALUES (
--   'tenant-uuid', 'uid-uuid', 'END_LOCATION', 'Indian Navy', 'INS Vikrant',
--   'depot-deployment-uuid', generate_deployment_access_token()
-- );

-- Example 5: Query current deployment status
-- SELECT * FROM v_uid_deployment_status 
-- WHERE client_part_number = '53022';

-- Example 6: Query deployment chain for a UID
-- WITH RECURSIVE deployment_chain AS (
--   -- Start with current deployment
--   SELECT *, 0 as level
--   FROM product_deployment_history
--   WHERE uid_id = 'uid-uuid' AND is_current_location = true
--   
--   UNION ALL
--   
--   -- Recursively get parent deployments
--   SELECT pdh.*, dc.level + 1
--   FROM product_deployment_history pdh
--   JOIN deployment_chain dc ON pdh.id = dc.parent_deployment_id
-- )
-- SELECT * FROM deployment_chain ORDER BY level DESC;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
