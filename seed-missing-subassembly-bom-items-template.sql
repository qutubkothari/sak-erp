-- Seed BOM component lines for newly created sub-assembly BOM headers
-- Tenant: f87a5ab0-0619-4f1c-bab9-e78ca750e56c
--
-- HOW TO USE:
-- 1) Replace the sample rows in input_rows with real component codes + quantities.
-- 2) Keep parent_code as one of the 5 target sub-assemblies.
-- 3) Run this script. It validates missing codes before insert.

BEGIN;

WITH input_rows AS (
  -- parent_code, component_code, qty, uom
  -- Replace these sample rows with your real BOM lines
  SELECT * FROM (
    VALUES
      ('HARDOWOODPACKING',     'REPLACE_COMPONENT_CODE_1', 1.0::numeric, 'PCS'::text),
      ('FAB-3DP-QX7-LCD-HOLD', 'REPLACE_COMPONENT_CODE_2', 1.0::numeric, 'PCS'::text),
      ('JETUNITSIGNALCAB',     'REPLACE_COMPONENT_CODE_3', 1.0::numeric, 'PCS'::text),
      ('FAB-3DP-X16-EXT-PILLER','REPLACE_COMPONENT_CODE_4',1.0::numeric, 'PCS'::text),
      ('CRAFTBATTERYHOLD',     'REPLACE_COMPONENT_CODE_5', 1.0::numeric, 'PCS'::text)
  ) AS t(parent_code, component_code, qty, uom)
),
parent_items AS (
  SELECT i.id, i.code
  FROM public.items i
  WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
    AND i.code IN (
      'HARDOWOODPACKING',
      'FAB-3DP-QX7-LCD-HOLD',
      'JETUNITSIGNALCAB',
      'FAB-3DP-X16-EXT-PILLER',
      'CRAFTBATTERYHOLD'
    )
),
parent_boms AS (
  -- pick active BOM if available, else latest BOM per parent item
  SELECT DISTINCT ON (bh.item_id)
    bh.id AS bom_id,
    bh.item_id,
    pi.code AS parent_code,
    bh.is_active,
    bh.version,
    bh.updated_at,
    bh.created_at
  FROM public.bom_headers bh
  JOIN parent_items pi ON pi.id = bh.item_id
  WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  ORDER BY bh.item_id, bh.is_active DESC, bh.version DESC NULLS LAST, bh.updated_at DESC, bh.created_at DESC
),
component_items AS (
  SELECT i.id, i.code
  FROM public.items i
  WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
),
resolved AS (
  SELECT
    pb.bom_id,
    pb.parent_code,
    ir.component_code,
    ci.id AS component_item_id,
    ir.qty,
    ir.uom
  FROM input_rows ir
  LEFT JOIN parent_boms pb ON pb.parent_code = ir.parent_code
  LEFT JOIN component_items ci ON ci.code = ir.component_code
),
validation AS (
  SELECT
    parent_code,
    component_code,
    qty,
    uom,
    CASE WHEN bom_id IS NULL THEN 'MISSING_PARENT_BOM' END AS parent_error,
    CASE WHEN component_item_id IS NULL THEN 'MISSING_COMPONENT_ITEM' END AS component_error
  FROM resolved
)
SELECT *
FROM validation
WHERE parent_error IS NOT NULL OR component_error IS NOT NULL;

-- If the SELECT above returns any rows, STOP and fix codes before running insert.

WITH input_rows AS (
  SELECT * FROM (
    VALUES
      ('HARDOWOODPACKING',     'REPLACE_COMPONENT_CODE_1', 1.0::numeric, 'PCS'::text),
      ('FAB-3DP-QX7-LCD-HOLD', 'REPLACE_COMPONENT_CODE_2', 1.0::numeric, 'PCS'::text),
      ('JETUNITSIGNALCAB',     'REPLACE_COMPONENT_CODE_3', 1.0::numeric, 'PCS'::text),
      ('FAB-3DP-X16-EXT-PILLER','REPLACE_COMPONENT_CODE_4',1.0::numeric, 'PCS'::text),
      ('CRAFTBATTERYHOLD',     'REPLACE_COMPONENT_CODE_5', 1.0::numeric, 'PCS'::text)
  ) AS t(parent_code, component_code, qty, uom)
),
parent_items AS (
  SELECT i.id, i.code
  FROM public.items i
  WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
),
parent_boms AS (
  SELECT DISTINCT ON (bh.item_id)
    bh.id AS bom_id,
    bh.item_id,
    pi.code AS parent_code
  FROM public.bom_headers bh
  JOIN parent_items pi ON pi.id = bh.item_id
  WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  ORDER BY bh.item_id, bh.is_active DESC, bh.version DESC NULLS LAST, bh.updated_at DESC, bh.created_at DESC
),
component_items AS (
  SELECT i.id, i.code
  FROM public.items i
  WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
),
resolved AS (
  SELECT
    pb.bom_id,
    pb.parent_code,
    ci.id AS component_item_id,
    ir.qty,
    ir.uom
  FROM input_rows ir
  JOIN parent_boms pb ON pb.parent_code = ir.parent_code
  JOIN component_items ci ON ci.code = ir.component_code
  WHERE ir.qty > 0
)
INSERT INTO public.bom_items (
  bom_id,
  item_id,
  quantity,
  uom,
  created_at,
  updated_at
)
SELECT
  r.bom_id,
  r.component_item_id,
  r.qty,
  r.uom,
  NOW(),
  NOW()
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.bom_items bi
  WHERE bi.bom_id = r.bom_id
    AND bi.item_id = r.component_item_id
);

-- Verify inserted line counts for target parent BOMs
SELECT
  pi.code AS parent_code,
  COUNT(bi.id) AS component_rows
FROM public.items pi
JOIN public.bom_headers bh
  ON bh.item_id = pi.id
 AND bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
LEFT JOIN public.bom_items bi ON bi.bom_id = bh.id
WHERE pi.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND pi.code IN (
    'HARDOWOODPACKING',
    'FAB-3DP-QX7-LCD-HOLD',
    'JETUNITSIGNALCAB',
    'FAB-3DP-X16-EXT-PILLER',
    'CRAFTBATTERYHOLD'
  )
GROUP BY pi.code
ORDER BY pi.code;

COMMIT;
