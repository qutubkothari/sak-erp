-- ============================================================================
-- DATA VERIFICATION SCRIPT
-- ============================================================================
-- This script shows you what data currently exists in your database
-- Run this to see what remains after cleanup
-- ============================================================================

-- MASTER DATA (Should remain unless you want to delete it)
SELECT 'MASTER DATA' as category, '==================' as details;

SELECT 'tenants' as table_name, COUNT(*) as record_count FROM tenants
UNION ALL
SELECT 'users', COUNT(*) FROM users WHERE id NOT IN (SELECT id FROM tenants)
UNION ALL
SELECT 'plants', COUNT(*) FROM plants
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'items', COUNT(*) FROM items
ORDER BY table_name;

-- TRANSACTIONAL DATA (Should be 0 after cleanup)
SELECT '' as spacer, '' as space;
SELECT 'TRANSACTIONAL DATA' as category, '(should be 0)' as details;

-- Create a temp table to store results
CREATE TEMP TABLE IF NOT EXISTS data_counts (
    table_name text,
    record_count bigint
);

TRUNCATE data_counts;

-- Check each table dynamically
DO $$
DECLARE
    cnt bigint;
    tables text[] := ARRAY[
        'production_orders', 'production_assemblies', 'production_routing', 
        'work_stations', 'station_completions', 'uid_registry', 'uids',
        'quality_inspections', 'ncr', 'defective_units', 'repair_orders', 
        'return_to_vendor', 'inventory_transactions', 'stock_movements',
        'purchase_requisitions', 'purchase_requisition_items', 'purchase_orders', 
        'purchase_order_items', 'grn', 'grn_items', 'quotations', 'quotation_items',
        'sales_orders', 'sales_order_items', 'service_requests', 'service_history',
        'documents', 'document_revisions', 'document_categories', 'bom', 'bom_items'
    ];
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('SELECT COUNT(*) FROM %I', tbl) INTO cnt;
            INSERT INTO data_counts VALUES (tbl, cnt);
        ELSE
            INSERT INTO data_counts VALUES (tbl, NULL);
        END IF;
    END LOOP;
END $$;

SELECT 
    table_name,
    CASE 
        WHEN record_count IS NULL THEN 'N/A (table not found)'
        ELSE record_count::text
    END as record_count
FROM data_counts
ORDER BY table_name;

-- SUMMARY
SELECT '' as spacer, '' as space;
SELECT 'SUMMARY' as category, '==================' as details;

SELECT 
    'Total Transactional Records' as description,
    SUM(record_count)::bigint as count
FROM data_counts
WHERE record_count IS NOT NULL;

-- DETAILED RECORD INSPECTION (Shows actual data for non-zero tables)
SELECT '' as spacer, '' as space;
SELECT 'DETAILED INSPECTION' as category, '==================' as details;
SELECT 'If any of the above transactional counts are > 0, check details below:' as note;

-- Show production orders if any exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM production_orders LIMIT 1) THEN
        RAISE NOTICE 'PRODUCTION ORDERS FOUND:';
    END IF;
END $$;
SELECT * FROM production_orders LIMIT 5;

-- Show purchase orders if any exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM purchase_orders LIMIT 1) THEN
        RAISE NOTICE 'PURCHASE ORDERS FOUND:';
    END IF;
END $$;
SELECT * FROM purchase_orders LIMIT 5;

-- Show sales orders if any exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM sales_orders LIMIT 1) THEN
        RAISE NOTICE 'SALES ORDERS FOUND:';
    END IF;
END $$;
SELECT * FROM sales_orders LIMIT 5;

-- Show GRNs if any exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM grn LIMIT 1) THEN
        RAISE NOTICE 'GRN RECORDS FOUND:';
    END IF;
END $$;
SELECT * FROM grn LIMIT 5;

-- Show UIDs if any exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM uid_registry LIMIT 1) THEN
        RAISE NOTICE 'UID REGISTRY RECORDS FOUND:';
    END IF;
END $$;
SELECT * FROM uid_registry LIMIT 5;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
/*
WHAT THIS SCRIPT SHOWS:
1. Master Data (tenants, users, plants, vendors, customers, items) - these are kept
2. Transactional Data - these should be 0 after cleanup
3. Summary of total transactional records
4. Sample records from any table that still has data

HOW TO USE:
1. Copy this entire script
2. Go to Supabase → SQL Editor
3. Paste and run
4. Review the results:
   - Master Data section shows what you're keeping
   - Transactional Data section should show 0 for all tables
   - If any transactional table shows > 0, you have remaining test data
   - The detailed inspection at the bottom shows samples of what remains

NEXT STEPS:
- If transactional data shows > 0, you need to run the cleanup script again
- If you want to delete master data too, run: DELETE FROM items, customers, vendors, plants
- Always keep tenants and admin users

*/
