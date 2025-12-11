-- ============================================================================
-- DATABASE BACKUP SCRIPT - Before Excel Import
-- Created: December 11, 2025
-- Purpose: Backup all data before importing from "Stock List 2024-2025.xlsx"
-- ============================================================================

-- Instructions:
-- 1. Run this in Supabase SQL Editor
-- 2. Copy the results to a safe location
-- 3. This creates a complete backup of all tables
-- ============================================================================

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_20251211;

-- ============================================================================
-- BACKUP INVENTORY TABLES
-- ============================================================================

-- Backup items table
CREATE TABLE backup_20251211.items AS 
SELECT * FROM public.items;

-- Backup warehouses table
CREATE TABLE backup_20251211.warehouses AS 
SELECT * FROM public.warehouses;

-- Backup stock_entries table
CREATE TABLE backup_20251211.stock_entries AS 
SELECT * FROM public.stock_entries;

-- ============================================================================
-- BACKUP BOM TABLES
-- ============================================================================

-- Backup bom_headers table
CREATE TABLE backup_20251211.bom_headers AS 
SELECT * FROM public.bom_headers;

-- Backup bom_items table
CREATE TABLE backup_20251211.bom_items AS 
SELECT * FROM public.bom_items;

-- Backup bom_child_boms table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bom_child_boms') THEN
        EXECUTE 'CREATE TABLE backup_20251211.bom_child_boms AS SELECT * FROM public.bom_child_boms';
    END IF;
END $$;

-- Backup bom_operations table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bom_operations') THEN
        EXECUTE 'CREATE TABLE backup_20251211.bom_operations AS SELECT * FROM public.bom_operations';
    END IF;
END $$;

-- ============================================================================
-- BACKUP VENDOR TABLES
-- ============================================================================

-- Backup vendors table
CREATE TABLE backup_20251211.vendors AS 
SELECT * FROM public.vendors;

-- Backup vendor_items table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_items') THEN
        EXECUTE 'CREATE TABLE backup_20251211.vendor_items AS SELECT * FROM public.vendor_items';
    END IF;
END $$;

-- ============================================================================
-- BACKUP UID TABLES
-- ============================================================================

-- Backup uid_registry table
CREATE TABLE backup_20251211.uid_registry AS 
SELECT * FROM public.uid_registry;

-- ============================================================================
-- BACKUP PURCHASE TABLES
-- ============================================================================

-- Backup purchase_requisitions table
CREATE TABLE backup_20251211.purchase_requisitions AS 
SELECT * FROM public.purchase_requisitions;

-- Backup purchase_requisition_items table
CREATE TABLE backup_20251211.purchase_requisition_items AS 
SELECT * FROM public.purchase_requisition_items;

-- Backup purchase_orders table
CREATE TABLE backup_20251211.purchase_orders AS 
SELECT * FROM public.purchase_orders;

-- Backup purchase_order_items table
CREATE TABLE backup_20251211.purchase_order_items AS 
SELECT * FROM public.purchase_order_items;

-- Backup grns table
CREATE TABLE backup_20251211.grns AS 
SELECT * FROM public.grns;

-- Backup grn_items table
CREATE TABLE backup_20251211.grn_items AS 
SELECT * FROM public.grn_items;

-- ============================================================================
-- BACKUP PRODUCTION TABLES
-- ============================================================================

-- Backup production_orders table
CREATE TABLE backup_20251211.production_orders AS 
SELECT * FROM public.production_orders;

-- ============================================================================
-- BACKUP SALES TABLES
-- ============================================================================

-- Backup customers table
CREATE TABLE backup_20251211.customers AS 
SELECT * FROM public.customers;

-- Backup sales_orders table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_orders') THEN
        EXECUTE 'CREATE TABLE backup_20251211.sales_orders AS SELECT * FROM public.sales_orders';
    END IF;
END $$;

-- Backup sales_order_items table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_order_items') THEN
        EXECUTE 'CREATE TABLE backup_20251211.sales_order_items AS SELECT * FROM public.sales_order_items';
    END IF;
END $$;

-- Backup dispatch_notes table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispatch_notes') THEN
        EXECUTE 'CREATE TABLE backup_20251211.dispatch_notes AS SELECT * FROM public.dispatch_notes';
    END IF;
END $$;

-- Backup dispatch_items table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dispatch_items') THEN
        EXECUTE 'CREATE TABLE backup_20251211.dispatch_items AS SELECT * FROM public.dispatch_items';
    END IF;
END $$;

-- ============================================================================
-- BACKUP COMPLETE - VERIFICATION QUERIES
-- ============================================================================

-- Count records in backup schema
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM backup_20251211."' || tablename || '") as record_count
FROM pg_tables 
WHERE schemaname = 'backup_20251211'
ORDER BY tablename;

-- Summary
SELECT 
    'BACKUP COMPLETE' as status,
    COUNT(*) as tables_backed_up,
    current_timestamp as backup_time
FROM pg_tables 
WHERE schemaname = 'backup_20251211';

-- ============================================================================
-- RESTORE INSTRUCTIONS (IF NEEDED)
-- ============================================================================

-- To restore a specific table:
-- DROP TABLE public.items CASCADE;
-- CREATE TABLE public.items AS SELECT * FROM backup_20251211.items;
-- (Then recreate indexes, constraints, and triggers)

-- To restore all tables:
-- 1. Drop all tables in public schema
-- 2. Recreate from backup_20251211 schema
-- 3. Run database-schema.sql to recreate constraints

-- ============================================================================
-- CLEANUP (Optional - after confirming backup is good)
-- ============================================================================

-- To drop backup schema after verification:
-- DROP SCHEMA backup_20251211 CASCADE;
