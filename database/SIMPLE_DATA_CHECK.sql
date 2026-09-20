-- ============================================================================
-- SIMPLE DATA CHECK - Shows what data exists in your database
-- ============================================================================

-- Check all tables and show record counts
SELECT 
    schemaname,
    tablename,
    (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
    SELECT 
        schemaname, 
        tablename,
        query_to_xml(
            format('SELECT COUNT(*) as cnt FROM %I.%I', schemaname, tablename), 
            false, 
            true, 
            ''
        ) as xml_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE 'sql_%'
) t
ORDER BY row_count DESC, tablename;

-- ============================================================================
-- Simple interpretation guide:
-- ============================================================================
-- KEEP (these should have data):
--   - tenants (your tenant/company data)
--   - users (user accounts)
--   - items (products/materials master data)
--   - customers (customer master data)
--   - vendors (vendor master data)  
--   - plants (warehouse/plant master data)
--
-- DELETE (these should be 0 for clean testing):
--   - production_orders
--   - purchase_orders
--   - sales_orders
--   - grn (goods receipt notes)
--   - uid_registry (product tracking)
--   - quality_inspections
--   - inventory_transactions
--   - stock_movements
--   - bom, bom_items
--   - quotations, quotation_items
--   - Any other transactional tables
-- ============================================================================
