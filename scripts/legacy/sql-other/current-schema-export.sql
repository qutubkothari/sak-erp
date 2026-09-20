-- ============================================================================
-- TABLE SCHEMA EXPORT - Current Database Structure
-- Created: December 11, 2025
-- Purpose: Document current schema before making changes
-- ============================================================================

-- This file documents the current structure of key tables
-- Run in Supabase SQL Editor to see current state

-- ============================================================================
-- ITEMS TABLE SCHEMA
-- ============================================================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'items'
ORDER BY ordinal_position;

-- Sample current items
SELECT 
    id, item_code, item_name, category, uom, 
    reorder_level, unit_price, created_at
FROM items 
LIMIT 10;

-- ============================================================================
-- VENDORS TABLE SCHEMA
-- ============================================================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'vendors'
ORDER BY ordinal_position;

-- Sample current vendors
SELECT 
    id, vendor_code, vendor_name, contact_person, 
    email, phone, created_at
FROM vendors 
LIMIT 10;

-- ============================================================================
-- BOM_HEADERS TABLE SCHEMA
-- ============================================================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'bom_headers'
ORDER BY ordinal_position;

-- Sample current BOMs
SELECT 
    id, bom_number, item_id, version, status, 
    is_multi_level, created_at
FROM bom_headers 
LIMIT 10;

-- ============================================================================
-- BOM_ITEMS TABLE SCHEMA
-- ============================================================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'bom_items'
ORDER BY ordinal_position;

-- Sample current BOM items
SELECT 
    id, bom_id, item_id, quantity, uom, 
    wastage_percentage, created_at
FROM bom_items 
LIMIT 10;

-- ============================================================================
-- STOCK TABLE SCHEMA
-- ============================================================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'stock'
ORDER BY ordinal_position;

-- Sample current stock
SELECT 
    id, item_id, location_id, quantity_available, 
    quantity_reserved, updated_at
FROM stock 
LIMIT 10;

-- ============================================================================
-- COUNTS SUMMARY
-- ============================================================================

SELECT 
    'items' as table_name, COUNT(*) as current_count 
FROM items
UNION ALL
SELECT 'vendors', COUNT(*) FROM vendors
UNION ALL
SELECT 'bom_headers', COUNT(*) FROM bom_headers
UNION ALL
SELECT 'bom_items', COUNT(*) FROM bom_items
UNION ALL
SELECT 'stock', COUNT(*) FROM stock
UNION ALL
SELECT 'uid_registry', COUNT(*) FROM uid_registry;

-- ============================================================================
-- ITEM CATEGORY DISTRIBUTION
-- ============================================================================

SELECT 
    category,
    COUNT(*) as count
FROM items
GROUP BY category
ORDER BY count DESC;
