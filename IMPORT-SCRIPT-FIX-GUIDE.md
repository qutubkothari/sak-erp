-- ============================================================================
-- GUIDE: Fix Excel Import Scripts for Sub-Assembly BOMs
-- ============================================================================
-- Problem: generate-import-sql-v2.py inserts ALL BOM components as items
-- even when the component is itself a sub-assembly that should reference 
-- a child BOM instead.
--
-- Current broken code in generate-import-sql-v2.py (lines 274-290):
-- ```python
-- bom_sql.append(f"""INSERT INTO bom_items (bom_id, item_id, quantity, created_at)
-- SELECT 
--     bh.id,
--     i.id,
--     {quantity},
--     NOW()
-- FROM bom_headers bh
-- CROSS JOIN items i
-- WHERE bh.item_id = (SELECT id FROM items WHERE name = '{assembly_name}' LIMIT 1)
--   AND i.name = '{rm_name}'
-- """)
-- ```
-- ============================================================================

-- Solution: Update the import script to:
-- 1. Check if the component is a SUB_ASSEMBLY
-- 2. If yes, use component_type='BOM' and set child_bom_id
-- 3. If no, use component_type='ITEM' and set item_id

-- ============================================================================
-- CORRECTED PYTHON CODE FOR generate-import-sql-v2.py
-- ============================================================================

/*
Replace lines 274-290 with:

        bom_sql.append(f"""
-- Component: {rm_name}
INSERT INTO bom_items (bom_id, component_type, item_id, child_bom_id, quantity, created_at)
SELECT 
    bh.id,
    CASE 
        WHEN i.type = 'SUB_ASSEMBLY'::item_type THEN 'BOM'
        ELSE 'ITEM'
    END as component_type,
    CASE 
        WHEN i.type = 'SUB_ASSEMBLY'::item_type THEN NULL
        ELSE i.id
    END as item_id,
    CASE 
        WHEN i.type = 'SUB_ASSEMBLY'::item_type THEN (
            SELECT id FROM bom_headers WHERE item_id = i.id AND is_active = true LIMIT 1
        )
        ELSE NULL
    END as child_bom_id,
    {quantity},
    NOW()
FROM bom_headers bh
CROSS JOIN items i
WHERE bh.item_id = (SELECT id FROM items WHERE name = '{assembly_name}' AND type = 'SUB_ASSEMBLY'::item_type LIMIT 1)
  AND i.name = '{rm_name}'
  AND NOT EXISTS (
      SELECT 1 FROM bom_items bi2 
      WHERE bi2.bom_id = bh.id 
        AND (bi2.item_id = i.id OR bi2.child_bom_id = (SELECT id FROM bom_headers WHERE item_id = i.id LIMIT 1))
  )
LIMIT 1;
""")
*/

-- ============================================================================
-- ADDITIONAL SAFEGUARDS TO ADD
-- ============================================================================

-- 1. Add validation after import to catch any missed sub-assemblies:
WITH problematic_items AS (
  SELECT 
    bi.id,
    bi.bom_id,
    i.code,
    i.name,
    i.type
  FROM bom_items bi
  JOIN items i ON i.id = bi.item_id
  WHERE bi.component_type = 'ITEM'
    AND i.type = 'SUB_ASSEMBLY'
    AND EXISTS (SELECT 1 FROM bom_headers bh WHERE bh.item_id = i.id AND bh.is_active = true)
)
SELECT * FROM problematic_items;

-- 2. Add check for circular references:
WITH RECURSIVE bom_tree AS (
  -- Start with all BOMs
  SELECT 
    bh.id as bom_id,
    bh.item_id,
    i.code,
    ARRAY[bh.id] as path,
    0 as depth
  FROM bom_headers bh
  JOIN items i ON i.id = bh.item_id
  WHERE bh.is_active = true
  
  UNION ALL
  
  -- Recursively get child BOMs
  SELECT 
    child_bh.id,
    child_bh.item_id,
    child_i.code,
    bt.path || child_bh.id,
    bt.depth + 1
  FROM bom_tree bt
  JOIN bom_items bi ON bi.bom_id = bt.bom_id
  JOIN bom_headers child_bh ON child_bh.id = bi.child_bom_id
  JOIN items child_i ON child_i.id = child_bh.item_id
  WHERE bi.component_type = 'BOM'
    AND NOT (child_bh.id = ANY(bt.path))  -- Prevent infinite loops
    AND bt.depth < 10  -- Max depth safeguard
)
SELECT 
  code,
  COUNT(*) as occurrence_count,
  MAX(depth) as max_depth
FROM bom_tree
GROUP BY code
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================
-- 1. Run fix-circular-reference-r9mx.sql to fix current circular reference
-- 2. Update generate-import-sql-v2.py with corrected code above
-- 3. Test with small Excel file before full import
-- 4. Run validation queries after every import
