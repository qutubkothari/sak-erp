-- ============================================================================
-- DELETE ALL ITEMS, VENDORS, AND BOMS FOR FRESH REIMPORT
-- ============================================================================
-- WARNING: This script will delete ALL items, vendors, and BOMs data
-- along with all related records (POs, PRs, GRNs, Stock, etc.)
-- Make sure to backup your database before running this script!
-- ============================================================================

BEGIN;

-- Display counts before deletion
DO $$
DECLARE
    v_items_count INTEGER;
    v_vendors_count INTEGER;
    v_bom_headers_count INTEGER;
    v_bom_items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_items_count FROM items;
    SELECT COUNT(*) INTO v_vendors_count FROM vendors;
    SELECT COUNT(*) INTO v_bom_headers_count FROM bom_headers;
    SELECT COUNT(*) INTO v_bom_items_count FROM bom_items;
    
    RAISE NOTICE '=== COUNTS BEFORE DELETION ===';
    RAISE NOTICE 'Items: %', v_items_count;
    RAISE NOTICE 'Vendors: %', v_vendors_count;
    RAISE NOTICE 'BOM Headers: %', v_bom_headers_count;
    RAISE NOTICE 'BOM Items: %', v_bom_items_count;
    RAISE NOTICE '================================';
END $$;

-- ============================================================================
-- STEP 1: Delete BOM-related data
-- ============================================================================
RAISE NOTICE 'Deleting BOM items...';
DELETE FROM bom_items;

RAISE NOTICE 'Deleting BOM headers...';
DELETE FROM bom_headers;

-- ============================================================================
-- STEP 2: Delete Item-Vendor relationships
-- ============================================================================
RAISE NOTICE 'Deleting item-vendor relationships...';
DELETE FROM item_vendors WHERE TRUE;

-- ============================================================================
-- STEP 3: Delete Purchase-related data that references items/vendors
-- ============================================================================

-- Delete GRN items (references items)
RAISE NOTICE 'Deleting GRN items...';
DELETE FROM grn_items;

-- Delete GRNs (references vendors)
RAISE NOTICE 'Deleting GRNs...';
DELETE FROM grns;

-- Delete Purchase Order items (references items)
RAISE NOTICE 'Deleting Purchase Order items...';
DELETE FROM purchase_order_items;

-- Delete Purchase Orders (references vendors)
RAISE NOTICE 'Deleting Purchase Orders...';
DELETE FROM purchase_orders;

-- Delete Purchase Requisition items (references items)
RAISE NOTICE 'Deleting Purchase Requisition items...';
DELETE FROM purchase_requisition_items;

-- Delete Purchase Requisitions
RAISE NOTICE 'Deleting Purchase Requisitions...';
DELETE FROM purchase_requisitions;

-- ============================================================================
-- STEP 4: Delete Sales-related data (if tables exist)
-- ============================================================================

-- Delete Quotation items (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotation_items') THEN
        RAISE NOTICE 'Deleting Quotation items...';
        DELETE FROM quotation_items;
    END IF;
END $$;

-- Delete Quotations (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotations') THEN
        RAISE NOTICE 'Deleting Quotations...';
        DELETE FROM quotations;
    END IF;
END $$;

-- Delete Sales Order items (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_items') THEN
        RAISE NOTICE 'Deleting Sales Order items...';
        DELETE FROM sales_order_items;
    END IF;
END $$;

-- Delete Sales Orders (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_orders') THEN
        RAISE NOTICE 'Deleting Sales Orders...';
        DELETE FROM sales_orders;
    END IF;
END $$;

-- Delete Dispatch items (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispatch_items') THEN
        RAISE NOTICE 'Deleting Dispatch items...';
        DELETE FROM dispatch_items;
    END IF;
END $$;

-- Delete Dispatches (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispatches') THEN
        RAISE NOTICE 'Deleting Dispatches...';
        DELETE FROM dispatches;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Delete Production-related data
-- ============================================================================

-- Delete Production Orders (references items)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_orders') THEN
        RAISE NOTICE 'Deleting Production Orders...';
        DELETE FROM production_orders;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Delete Inventory/Stock data
-- ============================================================================

-- Delete Stock Entries (references items)
RAISE NOTICE 'Deleting Stock Entries...';
DELETE FROM stock_entries;

-- ============================================================================
-- STEP 7: Delete UID Registry data (references items and vendors as suppliers)
-- ============================================================================
RAISE NOTICE 'Deleting UID Registry entries...';
DELETE FROM uid_registry;

-- ============================================================================
-- STEP 8: Delete RFQ-related data (if exists)
-- ============================================================================

-- Delete RFQ items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rfq_items') THEN
        RAISE NOTICE 'Deleting RFQ items...';
        DELETE FROM rfq_items;
    END IF;
END $$;

-- Delete PR item RFQ vendors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pr_item_rfq_vendors') THEN
        RAISE NOTICE 'Deleting PR item RFQ vendors...';
        DELETE FROM pr_item_rfq_vendors;
    END IF;
END $$;

-- Delete RFQs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rfqs') THEN
        RAISE NOTICE 'Deleting RFQs...';
        DELETE FROM rfqs;
    END IF;
END $$;

-- ============================================================================
-- STEP 9: Delete Item Drawing Documents (if exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'item_drawings') THEN
        RAISE NOTICE 'Deleting Item Drawings...';
        DELETE FROM item_drawings;
    END IF;
END $$;

-- ============================================================================
-- STEP 10: Delete Debit Note items (if exists)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debit_note_items') THEN
        RAISE NOTICE 'Deleting Debit Note items...';
        DELETE FROM debit_note_items;
    END IF;
END $$;

-- Delete Debit Notes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debit_notes') THEN
        RAISE NOTICE 'Deleting Debit Notes...';
        DELETE FROM debit_notes;
    END IF;
END $$;

-- ============================================================================
-- STEP 11: Finally, delete ITEMS and VENDORS
-- ============================================================================

RAISE NOTICE 'Deleting ALL ITEMS...';
DELETE FROM items;

RAISE NOTICE 'Deleting ALL VENDORS...';
DELETE FROM vendors;

-- ============================================================================
-- Display final counts
-- ============================================================================
DO $$
DECLARE
    v_items_count INTEGER;
    v_vendors_count INTEGER;
    v_bom_headers_count INTEGER;
    v_bom_items_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_items_count FROM items;
    SELECT COUNT(*) INTO v_vendors_count FROM vendors;
    SELECT COUNT(*) INTO v_bom_headers_count FROM bom_headers;
    SELECT COUNT(*) INTO v_bom_items_count FROM bom_items;
    
    RAISE NOTICE '=== COUNTS AFTER DELETION ===';
    RAISE NOTICE 'Items: %', v_items_count;
    RAISE NOTICE 'Vendors: %', v_vendors_count;
    RAISE NOTICE 'BOM Headers: %', v_bom_headers_count;
    RAISE NOTICE 'BOM Items: %', v_bom_items_count;
    RAISE NOTICE '==============================';
    RAISE NOTICE 'Deletion completed successfully!';
    RAISE NOTICE 'You can now reimport items, vendors, and BOMs.';
END $$;

-- Commit the transaction
COMMIT;

-- ============================================================================
-- END OF DELETION SCRIPT
-- ============================================================================
