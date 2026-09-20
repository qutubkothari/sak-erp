-- ============================================
-- MIGRATE GRN TABLE TO GRNS
-- This script renames the grn table to grns and fixes all foreign keys
-- CRITICAL: Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Check if grns table already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns') THEN
    RAISE NOTICE '✅ grns table already exists';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn') THEN
    RAISE NOTICE '⚠️ grn table exists, needs migration to grns';
  ELSE
    RAISE NOTICE '❌ Neither grn nor grns table exists';
  END IF;
END $$;

-- Step 2: Rename grn table to grns (if grn exists and grns doesn't)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grn') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns') THEN
    ALTER TABLE grn RENAME TO grns;
    RAISE NOTICE '✅ Renamed grn table to grns';
  END IF;
END $$;

-- Step 3: Add status column if it doesn't exist
ALTER TABLE grns 
ADD COLUMN IF NOT EXISTS status grn_status DEFAULT 'DRAFT';

-- Step 4: Drop and recreate all foreign key constraints for grns table
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- FK to purchase_orders
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'grns'::regclass
    AND confrelid = 'purchase_orders'::regclass
    AND contype = 'f';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE grns DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '✅ Dropped old FK constraint: %', constraint_name;
  END IF;
  
  ALTER TABLE grns 
  ADD CONSTRAINT grns_po_id_fkey 
  FOREIGN KEY (po_id) 
  REFERENCES purchase_orders(id) 
  ON DELETE CASCADE;
  
  RAISE NOTICE '✅ Created FK constraint: grns_po_id_fkey';
  
  -- FK to vendors
  constraint_name := NULL;
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'grns'::regclass
    AND confrelid = 'vendors'::regclass
    AND contype = 'f';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE grns DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '✅ Dropped old FK constraint: %', constraint_name;
  END IF;
  
  ALTER TABLE grns 
  ADD CONSTRAINT grns_vendor_id_fkey 
  FOREIGN KEY (vendor_id) 
  REFERENCES vendors(id) 
  ON DELETE RESTRICT;
  
  RAISE NOTICE '✅ Created FK constraint: grns_vendor_id_fkey';
  
  -- FK to warehouses
  constraint_name := NULL;
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'grns'::regclass
    AND confrelid = 'warehouses'::regclass
    AND contype = 'f';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE grns DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '✅ Dropped old FK constraint: %', constraint_name;
  END IF;
  
  ALTER TABLE grns 
  ADD CONSTRAINT grns_warehouse_id_fkey 
  FOREIGN KEY (warehouse_id) 
  REFERENCES warehouses(id) 
  ON DELETE RESTRICT;
  
  RAISE NOTICE '✅ Created FK constraint: grns_warehouse_id_fkey';
  
  -- FK to users (received_by)
  constraint_name := NULL;
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'grns'::regclass
    AND confrelid = 'users'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) LIKE '%received_by%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE grns DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '✅ Dropped old FK constraint: %', constraint_name;
  END IF;
  
  ALTER TABLE grns 
  ADD CONSTRAINT grns_received_by_fkey 
  FOREIGN KEY (received_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;
  
  RAISE NOTICE '✅ Created FK constraint: grns_received_by_fkey';
END $$;

-- Step 5: Clean up orphaned grn_items records and update foreign key
DO $$
DECLARE
  constraint_name text;
  orphaned_count int;
BEGIN
  -- First, check for orphaned grn_items records
  SELECT COUNT(*) INTO orphaned_count
  FROM grn_items gi
  LEFT JOIN grns g ON gi.grn_id = g.id
  WHERE g.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE '⚠️ Found % orphaned grn_items records - deleting them', orphaned_count;
    
    -- Delete orphaned records
    DELETE FROM grn_items gi
    WHERE NOT EXISTS (
      SELECT 1 FROM grns g WHERE g.id = gi.grn_id
    );
    
    RAISE NOTICE '✅ Deleted % orphaned grn_items records', orphaned_count;
  ELSE
    RAISE NOTICE '✅ No orphaned grn_items records found';
  END IF;
  
  -- Find existing FK constraint from grn_items to grns (or grn)
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'grn_items'::regclass
    AND confrelid = 'grns'::regclass
    AND contype = 'f';
  
  IF constraint_name IS NULL THEN
    -- Try to find constraint pointing to old 'grn' table
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class r ON c.confrelid = r.oid
    WHERE c.conrelid = 'grn_items'::regclass
      AND r.relname = 'grn'
      AND c.contype = 'f';
    
    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE grn_items DROP CONSTRAINT IF EXISTS %I', constraint_name);
      RAISE NOTICE '✅ Dropped old grn_items FK constraint: %', constraint_name;
    END IF;
    
    -- Create new FK constraint
    ALTER TABLE grn_items 
    ADD CONSTRAINT grn_items_grn_id_fkey 
    FOREIGN KEY (grn_id) 
    REFERENCES grns(id) 
    ON DELETE CASCADE;
    
    RAISE NOTICE '✅ Created new FK constraint: grn_items_grn_id_fkey';
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: %', constraint_name;
  END IF;
END $$;

-- Step 6: Update stock_entries if they reference grn table
-- (stock_entries uses metadata JSON, so no FK to fix)

-- Step 7: Clean up orphaned uid_registry records and update foreign key
DO $$
DECLARE
  constraint_name text;
  orphaned_count int;
BEGIN
  -- First, check for orphaned uid_registry records
  SELECT COUNT(*) INTO orphaned_count
  FROM uid_registry u
  LEFT JOIN grns g ON u.grn_id = g.id
  WHERE u.grn_id IS NOT NULL AND g.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE '⚠️ Found % orphaned uid_registry records - setting grn_id to NULL', orphaned_count;
    
    -- Set grn_id to NULL for orphaned records (don't delete UIDs)
    UPDATE uid_registry
    SET grn_id = NULL
    WHERE grn_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM grns g WHERE g.id = uid_registry.grn_id
      );
    
    RAISE NOTICE '✅ Updated % orphaned uid_registry records', orphaned_count;
  ELSE
    RAISE NOTICE '✅ No orphaned uid_registry records found';
  END IF;
  
  -- Find existing FK constraint from uid_registry to grns
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'uid_registry'::regclass
    AND confrelid = 'grns'::regclass
    AND contype = 'f';
  
  IF constraint_name IS NULL THEN
    -- Try to find constraint pointing to old 'grn' table
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class r ON c.confrelid = r.oid
    WHERE c.conrelid = 'uid_registry'::regclass
      AND r.relname = 'grn'
      AND c.contype = 'f';
    
    IF constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE uid_registry DROP CONSTRAINT IF EXISTS %I', constraint_name);
      RAISE NOTICE '✅ Dropped old uid_registry FK constraint: %', constraint_name;
    END IF;
    
    -- Create new FK constraint
    ALTER TABLE uid_registry 
    ADD CONSTRAINT uid_registry_grn_id_fkey 
    FOREIGN KEY (grn_id) 
    REFERENCES grns(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Created new FK constraint: uid_registry_grn_id_fkey';
  ELSE
    RAISE NOTICE '✅ FK constraint already exists: %', constraint_name;
  END IF;
END $$;

-- Step 8: Verify the migration
SELECT 
  'grns table' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

SELECT 
  'status column' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'grns' AND column_name = 'status'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status;

-- Step 9: Show all foreign keys related to grns
SELECT
  conname as constraint_name,
  conrelid::regclass as from_table,
  confrelid::regclass as to_table,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE confrelid = 'grns'::regclass OR conrelid = 'grns'::regclass
ORDER BY conname;

-- Step 10: Final confirmation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grns')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grns' AND column_name = 'status')
     AND EXISTS (
       SELECT 1 FROM pg_constraint 
       WHERE conrelid = 'grns'::regclass 
         AND confrelid = 'purchase_orders'::regclass 
         AND contype = 'f'
     ) THEN
    RAISE NOTICE '✅✅✅ MIGRATION SUCCESSFUL! ✅✅✅';
    RAISE NOTICE 'grns table exists with status column and proper FK to purchase_orders';
  ELSE
    RAISE NOTICE '⚠️ Migration incomplete - please review the output above';
  END IF;
END $$;
