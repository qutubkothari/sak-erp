-- Disable UID generation for Raw Materials (RM) and Components (CP)
-- by setting uid_tracking = false for these item types
--
-- This uses a data-driven approach instead of code changes
-- Items with uid_tracking = false will NOT generate UIDs during GRN acceptance or job order completion
--
-- HOW TO USE:
-- 1) Review the items that will be affected (check SELECT queries below)
-- 2) Set the tenant_id_text variable below
-- 3) Run in Supabase SQL Editor

DO $$
DECLARE
  v_tenant_id_text text := 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
  v_tenant_id UUID;
  v_updated_count int;
BEGIN
  IF v_tenant_id_text IS NULL OR btrim(v_tenant_id_text) = '' OR v_tenant_id_text = 'PUT-TENANT-ID-HERE' THEN
    RAISE EXCEPTION 'Set v_tenant_id_text before running.';
  END IF;

  BEGIN
    v_tenant_id := v_tenant_id_text::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Invalid tenant id: %', v_tenant_id_text;
  END;

  RAISE NOTICE '=== CHECKING ITEMS ===';
  
  -- Show which items will be affected
  RAISE NOTICE 'Raw Materials (RM) items in this tenant:';
  WITH rm_items AS (
    SELECT id, code, name, type, category, uid_tracking, uid_strategy
    FROM items
    WHERE tenant_id = v_tenant_id
      AND (
        type = 'RAW_MATERIAL'
        OR category ILIKE '%RAW%MATERIAL%'
        OR category ILIKE '%RM%'
      )
  )
  SELECT COUNT(*) INTO v_updated_count FROM rm_items;
  RAISE NOTICE 'Found % RM items', v_updated_count;

  RAISE NOTICE 'Component (CP) items in this tenant:';
  WITH cp_items AS (
    SELECT id, code, name, type, category, uid_tracking, uid_strategy
    FROM items
    WHERE tenant_id = v_tenant_id
      AND (
        type = 'COMPONENT'
        OR category ILIKE '%COMPONENT%'
        OR category ILIKE '%CP%'
      )
  )
  SELECT COUNT(*) INTO v_updated_count FROM cp_items;
  RAISE NOTICE 'Found % CP items', v_updated_count;

  RAISE NOTICE '';
  RAISE NOTICE '=== DISABLING UID TRACKING ===';

  -- Update all Raw Materials to disable UID tracking
  UPDATE items
  SET uid_tracking = false, uid_strategy = 'NONE', updated_at = NOW()
  WHERE tenant_id = v_tenant_id
    AND (
      type = 'RAW_MATERIAL'
      OR category ILIKE '%RAW%MATERIAL%'
      OR category ILIKE '%RM%'
    )
    AND uid_tracking != false;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % RM items to uid_tracking=false', v_updated_count;

  -- Update all Components to disable UID tracking
  UPDATE items
  SET uid_tracking = false, uid_strategy = 'NONE', updated_at = NOW()
  WHERE tenant_id = v_tenant_id
    AND (
      type = 'COMPONENT'
      OR category ILIKE '%COMPONENT%'
      OR category ILIKE '%CP%'
    )
    AND uid_tracking != false;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % CP items to uid_tracking=false', v_updated_count;

  RAISE NOTICE '';
  RAISE NOTICE '✅ UID tracking disabled for RM and CP items';
  RAISE NOTICE '';
  RAISE NOTICE 'Remaining items with uid_tracking=true (will generate UIDs):';
  RAISE NOTICE '- Sub-Assemblies (SA)';
  RAISE NOTICE '- Finished Goods (FG)';

END $$;

-- ========================================
-- OPTIONAL: Verify the changes
-- ========================================
-- Run this to see which items currently have uid_tracking enabled/disabled
/*
SELECT 
  type,
  category,
  COUNT(*) as item_count,
  SUM(CASE WHEN uid_tracking = true THEN 1 ELSE 0 END) as with_uid_tracking_enabled,
  SUM(CASE WHEN uid_tracking = false THEN 1 ELSE 0 END) as with_uid_tracking_disabled
FROM items
WHERE tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
GROUP BY type, category
ORDER BY type, category;
*/
