-- ============================================
-- COMPLETE INVENTORY DIAGNOSTIC
-- Run this in Supabase SQL Editor to understand the actual database state
-- ============================================

\echo '===== CHECKING TABLE EXISTENCE ====='

-- Check which GRN table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn') THEN 'EXISTS'
    ELSE 'MISSING'
  END as grn_table_status;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns') THEN 'EXISTS'
    ELSE 'MISSING'
  END as grns_table_status;

\echo '===== GRN TABLE STRUCTURE ====='

-- If 'grn' table exists, show its structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn') THEN
    RAISE NOTICE 'Table GRN exists - showing columns:';
  END IF;
END $$;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'grn'
ORDER BY ordinal_position;

\echo '===== GRNS TABLE STRUCTURE ====='

-- If 'grns' table exists, show its structure  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns') THEN
    RAISE NOTICE 'Table GRNS exists - showing columns:';
  END IF;
END $$;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'grns'
ORDER BY ordinal_position;

\echo '===== GRN STATUS COLUMN CHECK ====='

-- Check if status column exists in grn
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'grn' AND column_name = 'status'
    ) THEN 'EXISTS in grn'
    ELSE 'MISSING in grn'
  END as grn_status_column;

-- Check if status column exists in grns
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'grns' AND column_name = 'status'
    ) THEN 'EXISTS in grns'
    ELSE 'MISSING in grns'
  END as grns_status_column;

\echo '===== INVENTORY TABLES CHECK ====='

-- Check stock_entries
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_entries') THEN 'EXISTS'
    ELSE 'MISSING'
  END as stock_entries_status;

-- Check inventory_stock  
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_stock') THEN 'EXISTS'
    ELSE 'MISSING'
  END as inventory_stock_status;

-- Check inventory (old table that production service might be using)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN 'EXISTS'
    ELSE 'MISSING'
  END as inventory_table_status;

\echo '===== STOCK_ENTRIES STRUCTURE ====='

SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'stock_entries'
ORDER BY ordinal_position;

\echo '===== DATA COUNTS ====='

-- Count GRN records
SELECT 
  (SELECT COUNT(*) FROM grn WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn')) as grn_count,
  (SELECT COUNT(*) FROM grns WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns')) as grns_count;

-- Count GRN items
SELECT COUNT(*) as grn_items_count 
FROM grn_items;

-- Count stock entries
SELECT COUNT(*) as stock_entries_count 
FROM stock_entries
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_entries');

-- Count UIDs
SELECT COUNT(*) as uid_count 
FROM uid_registry
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uid_registry');

\echo '===== RECENT GRN SAMPLE ====='

-- Show recent GRN (from whichever table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn') THEN
    RAISE NOTICE 'Showing sample from GRN table:';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns') THEN
    RAISE NOTICE 'Showing sample from GRNS table:';
  END IF;
END $$;

-- Try grn table
SELECT 
  id, 
  grn_number, 
  status,
  grn_date,
  created_at
FROM grn
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn')
ORDER BY created_at DESC 
LIMIT 3;

-- Try grns table
SELECT 
  id, 
  grn_number, 
  status,
  receipt_date,
  created_at
FROM grns
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns')
ORDER BY created_at DESC 
LIMIT 3;

\echo '===== ENUM TYPES CHECK ====='

-- Check grn_status enum
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'grn_status'
ORDER BY e.enumsortorder;

\echo '===== FOREIGN KEY RELATIONSHIPS ====='

-- Check what grn_items references
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'grn_items' 
  AND tc.constraint_type = 'FOREIGN KEY';

\echo '===== RECOMMENDED ACTION ====='

DO $$
DECLARE
  has_grn boolean;
  has_grns boolean;
  grn_has_status boolean;
  grns_has_status boolean;
BEGIN
  -- Check which tables exist
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn') INTO has_grn;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns') INTO has_grns;
  
  -- Check status columns
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grn' AND column_name = 'status') INTO grn_has_status;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grns' AND column_name = 'status') INTO grns_has_status;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC SUMMARY:';
  RAISE NOTICE '========================================';
  
  IF has_grn AND has_grns THEN
    RAISE NOTICE '⚠️  BOTH grn AND grns tables exist! This is a problem.';
    RAISE NOTICE '    Code uses: grn';
    RAISE NOTICE '    Schema defines: grns';
    RAISE NOTICE '    → ACTION: Consolidate to ONE table';
  ELSIF has_grn THEN
    RAISE NOTICE '✓ Only GRN table exists';
    IF grn_has_status THEN
      RAISE NOTICE '  ✓ Status column exists';
    ELSE
      RAISE NOTICE '  ✗ Status column MISSING - need to add it';
    END IF;
  ELSIF has_grns THEN
    RAISE NOTICE '✓ Only GRNS table exists';
    RAISE NOTICE '⚠️  But code references GRN - need to update code';
    IF grns_has_status THEN
      RAISE NOTICE '  ✓ Status column exists';
    ELSE
      RAISE NOTICE '  ✗ Status column MISSING - need to add it';
    END IF;
  ELSE
    RAISE NOTICE '✗ Neither GRN nor GRNS table exists!';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
