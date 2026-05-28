-- ============================================================================
-- SYNC STOCK DATA: LIVE → PMSTEST
-- For Production Module Trials by Abdul
-- 
-- Instructions:
-- 1. Run this on PMSTEST database via Supabase SQL Editor
-- 2. Ensure foreign data wrapper is set up for live database
-- 3. Or export/import via CSV for simpler approach
-- ============================================================================

-- Method 1: Using Foreign Data Wrapper (if live DB is accessible)
-- First, create extension and foreign server (run as superuser):
/*
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

CREATE SERVER live_server 
FOREIGN DATA WRAPPER postgres_fdw 
OPTIONS (host 'live-db-host', port '5432', dbname 'postgres');

CREATE USER MAPPING FOR current_user 
SERVER live_server 
OPTIONS (user 'postgres', password 'your-password');
*/

-- Method 2: Export/Import via CSV (Recommended for PMSTEST)
-- Use Supabase dashboard → Table Editor → Export CSV
-- Then Import CSV to PMSTEST

-- Tables to sync (in order for FK constraints):
-- 1. companies
-- 2. plants  
-- 3. warehouses
-- 4. vendors
-- 5. items (products & raw materials)
-- 6. stock_entries (stock transactions)
-- 7. uid_registry (UID tracking for traceability)
-- 8. bom_headers (Bill of Materials)
-- 9. bom_items (BOM components)
-- 10. production_orders (existing production orders)
-- 11. production_stages (production stages)

-- ============================================================================
-- STEP 1: Clear existing test data (optional - be careful!)
-- ============================================================================

-- Disable FK checks temporarily
-- SET session_replication_role = replica; -- PostgreSQL way

-- Truncate tables in reverse dependency order
/*
TRUNCATE TABLE production_stages CASCADE;
TRUNCATE TABLE production_orders CASCADE;
TRUNCATE TABLE bom_items CASCADE;
TRUNCATE TABLE bom_headers CASCADE;
TRUNCATE TABLE stock_entries CASCADE;
TRUNCATE TABLE uid_registry CASCADE;
TRUNCATE TABLE items CASCADE;
TRUNCATE TABLE warehouses CASCADE;
TRUNCATE TABLE plants CASCADE;
TRUNCATE TABLE companies CASCADE;
TRUNCATE TABLE vendors CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE suppliers CASCADE;
*/

-- ============================================================================
-- STEP 2: Copy data from foreign tables (if FDW is set up)
-- ============================================================================

/*
-- Companies
INSERT INTO companies 
SELECT * FROM live_server.companies
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  updated_at = EXCLUDED.updated_at;

-- Plants  
INSERT INTO plants
SELECT * FROM live_server.plants
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  company_id = EXCLUDED.company_id,
  updated_at = EXCLUDED.updated_at;

-- Warehouses
INSERT INTO warehouses
SELECT * FROM live_server.warehouses
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  plant_id = EXCLUDED.plant_id,
  updated_at = EXCLUDED.updated_at;

-- Vendors
INSERT INTO vendors
SELECT * FROM live_server.vendors
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  updated_at = EXCLUDED.updated_at;

-- Items (master data)
INSERT INTO items
SELECT * FROM live_server.items
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  sub_category = EXCLUDED.sub_category,
  uom = EXCLUDED.uom,
  reorder_level = EXCLUDED.reorder_level,
  updated_at = EXCLUDED.updated_at;

-- Stock Entries
INSERT INTO stock_entries
SELECT * FROM live_server.stock_entries
ON CONFLICT (id) DO NOTHING;

-- UID Registry
INSERT INTO uid_registry
SELECT * FROM live_server.uid_registry
ON CONFLICT (id) DO NOTHING;

-- BOM Headers
INSERT INTO bom_headers
SELECT * FROM live_server.bom_headers
ON CONFLICT (id) DO UPDATE SET
  version = EXCLUDED.version,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- BOM Items
INSERT INTO bom_items
SELECT * FROM live_server.bom_items
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  updated_at = EXCLUDED.updated_at;

-- Production Orders
INSERT INTO production_orders
SELECT * FROM live_server.production_orders
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  quantity = EXCLUDED.quantity,
  scheduled_start = EXCLUDED.scheduled_start,
  scheduled_end = EXCLUDED.scheduled_end,
  updated_at = EXCLUDED.updated_at;

-- Production Stages
INSERT INTO production_stages
SELECT * FROM live_server.production_stages
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  stage_number = EXCLUDED.stage_number,
  stage_name = EXCLUDED.stage_name,
  updated_at = EXCLUDED.updated_at;
*/

-- ============================================================================
-- STEP 3: Verify sync (count records in each table)
-- ============================================================================

-- Core tables (always exist)
SELECT 'companies' as table_name, COUNT(*) as record_count FROM companies
UNION ALL
SELECT 'plants', COUNT(*) FROM plants
UNION ALL
SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'stock_entries', COUNT(*) FROM stock_entries
UNION ALL
SELECT 'uid_registry', COUNT(*) FROM uid_registry

-- Optional tables (check existence first)
UNION ALL
SELECT 'bom_headers', CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bom_headers') 
    THEN (SELECT COUNT(*) FROM bom_headers) 
    ELSE 0 
END
UNION ALL
SELECT 'bom_items', CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bom_items') 
    THEN (SELECT COUNT(*) FROM bom_items) 
    ELSE 0 
END
UNION ALL
SELECT 'production_orders', CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') 
    THEN (SELECT COUNT(*) FROM production_orders) 
    ELSE 0 
END
UNION ALL
SELECT 'production_stages', CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_stages') 
    THEN (SELECT COUNT(*) FROM production_stages) 
    ELSE 0 
END

ORDER BY table_name;

-- ============================================================================
-- STEP 4: Quick stock summary by item (PMSTEST schema)
-- ============================================================================

SELECT 
  i.code as item_code,
  i.name as item_name,
  i.category,
  i.type as item_type,
  SUM(se.quantity) as current_stock,
  SUM(se.available_quantity) as available_stock,
  SUM(se.allocated_quantity) as allocated_stock
FROM items i
LEFT JOIN stock_entries se ON se.item_id = i.id
GROUP BY i.id, i.code, i.name, i.category, i.type
ORDER BY current_stock DESC
LIMIT 50;
