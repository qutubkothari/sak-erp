-- ============================================================================
-- COMPLETE DATA CLEANUP SCRIPT
-- ============================================================================
-- WARNING: This will delete ALL transactional data while preserving structure
-- Use this for testing purposes only
-- Run this in Supabase SQL Editor before each test cycle
-- ============================================================================

-- DISABLE FOREIGN KEY CHECKS (PostgreSQL doesn't have this, so we delete in order)

-- ============================================================================
-- STEP 1: DELETE PRODUCTION & MANUFACTURING DATA
-- ============================================================================

-- Production assembly components (child records first)
DELETE FROM production_assembly_components WHERE tenant_id IN (SELECT id FROM tenants);

-- Production assemblies
DELETE FROM production_assemblies WHERE tenant_id IN (SELECT id FROM tenants);

-- Production orders
DELETE FROM production_orders WHERE tenant_id IN (SELECT id FROM tenants);

-- Station completions
DELETE FROM station_completions WHERE production_order_id IN (SELECT id FROM production_orders);

-- Work stations
DELETE FROM work_stations WHERE tenant_id IN (SELECT id FROM tenants);

-- Production routing
DELETE FROM production_routing WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 2: DELETE UID TRACKING DATA
-- ============================================================================

-- UID registry (all product tracking)
DELETE FROM uid_registry WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 3: DELETE QUALITY & DEFECTS DATA
-- ============================================================================

-- Repair order items
DELETE FROM repair_order_items WHERE repair_order_id IN (SELECT id FROM repair_orders);

-- Repair orders
DELETE FROM repair_orders WHERE tenant_id IN (SELECT id FROM tenants);

-- RTV items
DELETE FROM rtv_items WHERE rtv_id IN (SELECT id FROM return_to_vendor);

-- Return to vendor
DELETE FROM return_to_vendor WHERE tenant_id IN (SELECT id FROM tenants);

-- Defective units
DELETE FROM defective_units WHERE tenant_id IN (SELECT id FROM tenants);

-- Quality inspections
DELETE FROM quality_inspections WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 4: DELETE INVENTORY DATA
-- ============================================================================

-- Inventory transactions
DELETE FROM inventory_transactions WHERE tenant_id IN (SELECT id FROM tenants);

-- Stock movements
DELETE FROM stock_movements WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 5: DELETE PURCHASE DATA
-- ============================================================================

-- GRN items
DELETE FROM grn_items WHERE grn_id IN (SELECT id FROM grn WHERE tenant_id IN (SELECT id FROM tenants));

-- GRN (Goods Receipt Notes)
DELETE FROM grn WHERE tenant_id IN (SELECT id FROM tenants);

-- Purchase order items
DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE tenant_id IN (SELECT id FROM tenants));

-- Purchase orders
DELETE FROM purchase_orders WHERE tenant_id IN (SELECT id FROM tenants);

-- Purchase requisition items
DELETE FROM purchase_requisition_items WHERE purchase_requisition_id IN (SELECT id FROM purchase_requisitions WHERE tenant_id IN (SELECT id FROM tenants));

-- Purchase requisitions
DELETE FROM purchase_requisitions WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 6: DELETE SALES DATA
-- ============================================================================

-- Sales order items
DELETE FROM sales_order_items WHERE sales_order_id IN (SELECT id FROM sales_orders WHERE tenant_id IN (SELECT id FROM tenants));

-- Sales orders
DELETE FROM sales_orders WHERE tenant_id IN (SELECT id FROM tenants);

-- Quotation items
DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE tenant_id IN (SELECT id FROM tenants));

-- Quotations
DELETE FROM quotations WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 7: DELETE SERVICE DATA
-- ============================================================================

-- Service history
DELETE FROM service_history WHERE service_request_id IN (SELECT id FROM service_requests WHERE tenant_id IN (SELECT id FROM tenants));

-- Service requests
DELETE FROM service_requests WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 8: DELETE DOCUMENT CONTROL DATA
-- ============================================================================

-- Document revisions
DELETE FROM document_revisions WHERE document_id IN (SELECT id FROM documents WHERE tenant_id IN (SELECT id FROM tenants));

-- Documents
DELETE FROM documents WHERE tenant_id IN (SELECT id FROM tenants);

-- Document categories
DELETE FROM document_categories WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 9: DELETE BOM DATA
-- ============================================================================

-- BOM items
DELETE FROM bom_items WHERE bom_id IN (SELECT id FROM bom WHERE tenant_id IN (SELECT id FROM tenants));

-- BOM (Bill of Materials)
DELETE FROM bom WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 10: DELETE MASTER DATA (Keep Structure)
-- ============================================================================

-- Items (products/materials)
DELETE FROM items WHERE tenant_id IN (SELECT id FROM tenants);

-- Customers
DELETE FROM customers WHERE tenant_id IN (SELECT id FROM tenants);

-- Vendors
DELETE FROM vendors WHERE tenant_id IN (SELECT id FROM tenants);

-- Plants/Warehouses
DELETE FROM plants WHERE tenant_id IN (SELECT id FROM tenants);

-- ============================================================================
-- STEP 11: RESET SEQUENCES (Optional - for clean numbering)
-- ============================================================================

-- Note: You may want to reset auto-increment sequences
-- This depends on your specific implementation

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify cleanup (all should return 0 or very small numbers)

SELECT 'production_orders' as table_name, COUNT(*) as remaining_records FROM production_orders
UNION ALL
SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'sales_orders', COUNT(*) FROM sales_orders
UNION ALL
SELECT 'grn', COUNT(*) FROM grn
UNION ALL
SELECT 'uid_registry', COUNT(*) FROM uid_registry
UNION ALL
SELECT 'bom', COUNT(*) FROM bom
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL
SELECT 'customers', COUNT(*) FROM customers;

-- ============================================================================
-- NOTES
-- ============================================================================

/*
WHAT IS PRESERVED:
- User accounts
- Tenant configuration
- System settings
- Table structures
- Indexes and constraints

WHAT IS DELETED:
- All transactional data
- All master data (items, vendors, customers)
- All tracking records (UIDs, quality, inventory)
- All documents

USAGE:
1. Copy this entire script
2. Go to Supabase → SQL Editor
3. Paste and run
4. Wait for completion
5. Verify with the SELECT queries at the end
6. System is now clean for fresh testing

IMPORTANT:
- Always backup before running in production
- This is for testing environments only
- Cannot be undone - data is permanently deleted
*/
