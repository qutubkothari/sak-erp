-- ============================================================================
-- FIX: Convert sub-assembly items to BOM components
-- ============================================================================
-- Problem: When BOMs are imported from Excel, sub-assemblies are stored as
-- regular items (component_type='ITEM', item_id set, child_bom_id=null)
-- instead of BOM components (component_type='BOM', child_bom_id set, item_id=null)
--
-- This SQL identifies sub-assemblies in bom_items and converts them to proper
-- BOM components so they explode correctly in Job Orders.
-- ============================================================================

BEGIN;

-- Step 1: Find all bom_items that reference sub-assembly items
-- (items that have their own BOMs)
WITH subassembly_components AS (
  SELECT 
    bi.id as bom_item_id,
    bi.bom_id,
    bi.item_id,
    bi.component_type,
    i.code as item_code,
    i.name as item_name,
    i.type as item_type,
    bh.id as child_bom_id
  FROM bom_items bi
  JOIN items i ON i.id = bi.item_id
  LEFT JOIN bom_headers bh ON bh.item_id = bi.item_id AND bh.is_active = true
  WHERE 
    bi.component_type = 'ITEM'  -- Currently stored as ITEM
    AND bi.item_id IS NOT NULL
    AND i.type = 'SUB_ASSEMBLY'  -- Is a sub-assembly
    AND bh.id IS NOT NULL  -- Has an active BOM
)
SELECT 
  COUNT(*) as total_to_fix,
  string_agg(DISTINCT item_code, ', ') as subassembly_codes
FROM subassembly_components;

-- Step 2: Update bom_items to convert them to BOM components
UPDATE bom_items bi
SET 
  component_type = 'BOM',
  child_bom_id = bh.id,
  item_id = NULL
FROM items i
JOIN bom_headers bh ON bh.item_id = i.id AND bh.is_active = true
WHERE 
  bi.item_id = i.id
  AND bi.component_type = 'ITEM'
  AND i.type = 'SUB_ASSEMBLY'
  AND bh.id IS NOT NULL;

-- Step 3: Verify the fix
SELECT 
  'After Fix:' as status,
  COUNT(*) as fixed_count
FROM bom_items bi
JOIN items i ON i.id = (
  SELECT bh.item_id 
  FROM bom_headers bh 
  WHERE bh.id = bi.child_bom_id
)
WHERE 
  bi.component_type = 'BOM'
  AND bi.child_bom_id IS NOT NULL
  AND i.type = 'SUB_ASSEMBLY';

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to see all BOMs with their components and types
SELECT 
  bh.id as bom_id,
  main_item.code as bom_for_item,
  main_item.name as bom_for_item_name,
  bi.component_type,
  CASE 
    WHEN bi.component_type = 'BOM' THEN child_item.code
    WHEN bi.component_type = 'ITEM' THEN component_item.code
  END as component_code,
  CASE 
    WHEN bi.component_type = 'BOM' THEN child_item.name
    WHEN bi.component_type = 'ITEM' THEN component_item.name
  END as component_name,
  CASE 
    WHEN bi.component_type = 'BOM' THEN child_item.type
    WHEN bi.component_type = 'ITEM' THEN component_item.type
  END as component_item_type,
  bi.quantity
FROM bom_headers bh
JOIN items main_item ON main_item.id = bh.item_id
JOIN bom_items bi ON bi.bom_id = bh.id
LEFT JOIN items component_item ON component_item.id = bi.item_id
LEFT JOIN bom_headers child_bom ON child_bom.id = bi.child_bom_id
LEFT JOIN items child_item ON child_item.id = child_bom.item_id
WHERE bh.is_active = true
ORDER BY bh.id, bi.sequence;
