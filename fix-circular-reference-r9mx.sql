-- ============================================================================
-- FIX: Remove circular reference in SA-R9MXADAP BOM
-- ============================================================================
-- Problem: SA-R9MXADAP BOM references itself as a component, causing infinite
-- loop in recursive BOM explosion
-- ============================================================================

BEGIN;

-- Find the circular reference
SELECT 
  bh.id as bom_id,
  i.code as bom_item_code,
  i.name as bom_item_name,
  bi.component_type,
  child_i.code as component_code,
  child_i.name as component_name
FROM bom_headers bh
JOIN items i ON i.id = bh.item_id
JOIN bom_items bi ON bi.bom_id = bh.id
JOIN bom_headers child_bh ON child_bh.id = bi.child_bom_id
JOIN items child_i ON child_i.id = child_bh.item_id
WHERE i.code = 'SA-R9MXADAP'
  AND child_i.code = 'SA-R9MXADAP';

-- Delete the circular reference
DELETE FROM bom_items bi
USING bom_headers bh, items i, bom_headers child_bh, items child_i
WHERE bi.bom_id = bh.id
  AND bh.item_id = i.id
  AND bi.child_bom_id = child_bh.id
  AND child_bh.item_id = child_i.id
  AND i.code = 'SA-R9MXADAP'
  AND child_i.code = 'SA-R9MXADAP';

-- Verify fix
SELECT 
  'After Fix:' as status,
  COUNT(*) as remaining_self_references
FROM bom_items bi
JOIN bom_headers bh ON bi.bom_id = bh.id
JOIN bom_headers child_bh ON bi.child_bom_id = child_bh.id
WHERE bh.item_id = child_bh.item_id;

COMMIT;
