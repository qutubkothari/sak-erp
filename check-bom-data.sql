-- Check BOM Data Health
-- This script helps identify issues with BOM items missing item_id references

-- 1. Count all BOMs
SELECT COUNT(*) as total_boms FROM public.bom_headers;

-- 2. Count all BOM items
SELECT COUNT(*) as total_bom_items FROM public.bom_items;

-- 3. Show all BOMs with their item counts
SELECT 
  bh.id,
  i.code as finished_item_code,
  i.name as finished_item_name,
  COUNT(bi.id) as item_count
FROM public.bom_headers bh
LEFT JOIN public.items i ON bh.item_id = i.id
LEFT JOIN public.bom_items bi ON bh.id = bi.bom_id
GROUP BY bh.id, i.code, i.name
ORDER BY i.code;

-- 4. Find BOM items with NULL item_id
-- NOTE: In this database, BOMs can be multi-level.
-- A bom_item may reference either:
--   - item_id (direct material/component)
--   - child_bom_id (sub-assembly BOM)
-- NULL item_id is only a problem if child_bom_id is ALSO NULL.
SELECT 
  bi.id,
  bi.bom_id,
  i.code as finished_item_code,
  i.name as finished_item_name,
  bi.child_bom_id,
  bi.quantity,
  bi.created_at
FROM public.bom_items bi
JOIN public.bom_headers bh ON bi.bom_id = bh.id
LEFT JOIN public.items i ON bh.item_id = i.id
WHERE bi.item_id IS NULL
ORDER BY i.code;

-- 4.1 Truly broken rows: both item_id and child_bom_id are NULL
SELECT
  bi.id,
  bi.bom_id,
  i.code as finished_item_code,
  i.name as finished_item_name,
  bi.quantity,
  bi.created_at
FROM public.bom_items bi
JOIN public.bom_headers bh ON bi.bom_id = bh.id
LEFT JOIN public.items i ON bh.item_id = i.id
WHERE bi.item_id IS NULL
  AND bi.child_bom_id IS NULL
ORDER BY i.code, bi.created_at, bi.id;

-- 5. Find BOM items where item_id doesn't exist in items table
SELECT 
  bi.id,
  bi.bom_id,
  bi.item_id,
  i.code as finished_item_code,
  i.name as finished_item_name,
  bi.quantity,
  bi.created_at
FROM public.bom_items bi
JOIN public.bom_headers bh ON bi.bom_id = bh.id
LEFT JOIN public.items i ON bh.item_id = i.id
WHERE bi.item_id IS NOT NULL
  AND bi.item_id NOT IN (SELECT id FROM public.items)
ORDER BY i.code;

-- 5.1 Find BOM items where child_bom_id doesn't exist in bom_headers
SELECT
  bi.id,
  bi.bom_id,
  i.code as finished_item_code,
  i.name as finished_item_name,
  bi.child_bom_id,
  bi.quantity,
  bi.created_at
FROM public.bom_items bi
JOIN public.bom_headers bh ON bi.bom_id = bh.id
LEFT JOIN public.items i ON bh.item_id = i.id
WHERE bi.child_bom_id IS NOT NULL
  AND bi.child_bom_id NOT IN (SELECT id FROM public.bom_headers)
ORDER BY i.code;

-- 6. Show BOMs with detailed item information (those that are OK)
SELECT 
  bh.id as bom_id,
  fg.code as finished_item_code,
  fg.name as finished_item_name,
  bi.id as item_relation_id,
  bi.item_id,
  i.code as component_code,
  i.name as component_name,
  bi.quantity
FROM public.bom_headers bh
LEFT JOIN public.items fg ON bh.item_id = fg.id
JOIN public.bom_items bi ON bh.id = bi.bom_id
LEFT JOIN public.items i ON bi.item_id = i.id
ORDER BY fg.code, i.code;

-- 7. Count summary
SELECT 
  (SELECT COUNT(*) FROM public.bom_headers) as total_boms,
  (SELECT COUNT(*) FROM public.bom_items) as total_bom_items,
  (SELECT COUNT(*) FROM public.bom_items WHERE item_id IS NULL) as bom_items_with_null_item_id,
  (SELECT COUNT(*) FROM public.bom_items WHERE child_bom_id IS NOT NULL) as bom_items_with_child_bom_id,
  (SELECT COUNT(*) FROM public.bom_items WHERE item_id IS NULL AND child_bom_id IS NULL) as bom_items_missing_both_ids,
  (SELECT COUNT(*) FROM public.bom_items bi WHERE bi.item_id IS NOT NULL AND bi.item_id NOT IN (SELECT id FROM public.items)) as bom_items_with_missing_items,
  (SELECT COUNT(*) FROM public.bom_items bi WHERE bi.child_bom_id IS NOT NULL AND bi.child_bom_id NOT IN (SELECT id FROM public.bom_headers)) as bom_items_with_missing_child_boms;

-- ========================================
-- Multi-level BOM inspection (example: FG-001)
-- ========================================

-- Change this to inspect any finished good code
WITH target_fg AS (
  SELECT 'FG-001'::text AS fg_code
),
top_bom AS (
  SELECT bh.*
  FROM public.bom_headers bh
  JOIN public.items fg ON fg.id = bh.item_id
  JOIN target_fg t ON fg.code = t.fg_code
  ORDER BY bh.is_active DESC, bh.version DESC NULLS LAST, bh.created_at DESC
  LIMIT 1
)
SELECT
  b.id AS bom_id,
  fg.code AS finished_item_code,
  fg.name AS finished_item_name,
  b.version,
  b.is_active,
  (SELECT COUNT(*) FROM public.bom_items bi WHERE bi.bom_id = b.id) AS component_rows
FROM top_bom b
JOIN public.items fg ON fg.id = b.item_id;

-- List resolved components for the selected FG BOM
WITH target_fg AS (
  SELECT 'FG-001'::text AS fg_code
),
top_bom AS (
  SELECT bh.*
  FROM public.bom_headers bh
  JOIN public.items fg ON fg.id = bh.item_id
  JOIN target_fg t ON fg.code = t.fg_code
  ORDER BY bh.is_active DESC, bh.version DESC NULLS LAST, bh.created_at DESC
  LIMIT 1
),
resolved AS (
  SELECT
    bi.id AS bom_item_id,
    bi.bom_id,
    bi.quantity,
    bi.item_id,
    bi.child_bom_id,
    CASE
      WHEN bi.child_bom_id IS NOT NULL THEN 'BOM'
      ELSE 'ITEM'
    END AS component_type,
    COALESCE(ci.id, i.id) AS component_item_id,
    COALESCE(ci.code, i.code) AS component_code,
    COALESCE(ci.name, i.name) AS component_name,
    cb.id AS child_bom_header_id,
    cb.version AS child_bom_version,
    cb.is_active AS child_bom_is_active
  FROM public.bom_items bi
  JOIN top_bom tb ON tb.id = bi.bom_id
  LEFT JOIN public.items i ON i.id = bi.item_id
  LEFT JOIN public.bom_headers cb ON cb.id = bi.child_bom_id
  LEFT JOIN public.items ci ON ci.id = cb.item_id
)
SELECT *
FROM resolved
ORDER BY component_type DESC, component_code NULLS LAST, bom_item_id;

-- Step 2.1: Inspect bom_items schema + the check constraint that blocked the update
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bom_items'
ORDER BY ordinal_position;

SELECT
  c.conname,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'bom_items'
  AND c.conname = 'chk_bom_item_or_child';

-- Step 2.2: Dump FG-001 bom_items as JSON so we can see which column stores the selected component
-- (This avoids guessing by row order.)
SELECT
  bi.id,
  bi.quantity,
  to_jsonb(bi) AS raw_row
FROM public.bom_items bi
WHERE bi.bom_id IN (
  SELECT bh.id
  FROM public.bom_headers bh
  JOIN public.items i ON bh.item_id = i.id
  WHERE i.code = 'FG-001'
)
ORDER BY bi.created_at, bi.id;


-- If you need to “fix” anything, focus on these signals:
-- - Rows where BOTH item_id and child_bom_id are NULL
-- - Rows where item_id points to a missing item
-- - Rows where child_bom_id points to a missing bom_headers record
