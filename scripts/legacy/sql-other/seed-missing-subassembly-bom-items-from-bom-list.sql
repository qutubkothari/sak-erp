-- Auto-filled from BOM-LIST.xlsx for missing sub-assembly BOM items
-- Tenant: f87a5ab0-0619-4f1c-bab9-e78ca750e56c
--
-- Source quality:
-- 1) JETUNITSIGNALCAB: from dedicated sheet "4-Jet unit Signl Cbl Dest. Assy" (reliable qty)
-- 2) FAB-3DP-QX7-LCD-HOLD / FAB-3DP-X16-EXT-PILLER / CRAFTBATTERYHOLD:
--    from CombineSFG parent mapping (qty not explicit in sheet) -> defaulted to 1.0, verify before final use
-- 3) HARDOWOODPACKING: no parent BOM lines found in BOM-LIST (manual definition required)

BEGIN;

WITH input_rows AS (
  -- parent_code, component_code, component_name, qty, source_note
  SELECT * FROM (
    VALUES
      -- JETUNITSIGNALCAB (dedicated sheet, trusted quantities)
      ('JETUNITSIGNALCAB', 'SOL-WIR-6040-ROHS-22AWG',         'Lead Wire 22AWG',                          2.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'CAB-MCO-6C14/38LENChetan',        '6 Core Wire 14/38',                        0.65::numeric, 'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'CON-CRS-LP12PF-CM-M6PL67-ST',     'LP12 6 pin plug male clip lock CM',        1.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'SEN-LEK-BLUEROBOTICS-PROB',       'Leak Probe Sponge - BlueRobotics',          1.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'SLN-STB-1.6M-4X-BK',              'HeatShrink Tube 1.5mm/1.6mm',               6.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),

      -- CombineSFG-derived parent mappings (qty defaulted to 1.0 - verify)
        ('FAB-3DP-QX7-LCD-HOLD', NULL,                          'Thread locker 270',                         1.0::numeric,  'BOM-LIST sheet: CombineSFG row 564 (qty defaulted)'),
        ('FAB-3DP-X16-EXT-PILLER', 'MAC-ADH-290-4MTO8M',        'Sealant - Thread Locker 290',               1.0::numeric,  'BOM-LIST sheet: CombineSFG row 565 (qty defaulted)'),
        ('CRAFTBATTERYHOLD', NULL,                              'Silicon Hose 4mm x 8mm',                    1.0::numeric,  'BOM-LIST sheet: CombineSFG row 557 (qty defaulted)')
      ) AS t(parent_code, component_code, component_name, qty, source_note)
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
  SELECT i.id, i.code, i.name
  FROM public.items i
  WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
),
resolved AS (
  SELECT
    ir.parent_code,
    pb.bom_id,
    ir.component_code,
    ir.component_name,
    COALESCE(ci_code.id, ci_name.id) AS component_item_id,
    COALESCE(ci_code.code, ci_name.code) AS resolved_component_code,
    COALESCE(ci_code.name, ci_name.name) AS resolved_component_name,
    ir.qty,
    ir.source_note
  FROM input_rows ir
  LEFT JOIN parent_boms pb ON pb.parent_code = ir.parent_code
  LEFT JOIN component_items ci_code ON ir.component_code IS NOT NULL AND ci_code.code = ir.component_code
  LEFT JOIN component_items ci_name ON ci_name.name = ir.component_name
),
validation AS (
  SELECT
    parent_code,
    component_code,
    component_name,
    qty,
    source_note,
    CASE WHEN bom_id IS NULL THEN 'MISSING_PARENT_BOM' END AS parent_error,
    CASE WHEN component_item_id IS NULL THEN 'MISSING_COMPONENT_ITEM' END AS component_error
  FROM resolved
)
SELECT *
FROM validation
WHERE parent_error IS NOT NULL OR component_error IS NOT NULL
ORDER BY parent_code, component_name;

-- If query above returns rows, verify/fix before insert.

WITH input_rows AS (
  SELECT * FROM (
    VALUES
      ('JETUNITSIGNALCAB', 'SOL-WIR-6040-ROHS-22AWG',         'Lead Wire 22AWG',                          2.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'CAB-MCO-6C14/38LENChetan',        '6 Core Wire 14/38',                        0.65::numeric, 'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'CON-CRS-LP12PF-CM-M6PL67-ST',     'LP12 6 pin plug male clip lock CM',        1.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'SEN-LEK-BLUEROBOTICS-PROB',       'Leak Probe Sponge - BlueRobotics',          1.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('JETUNITSIGNALCAB', 'SLN-STB-1.6M-4X-BK',              'HeatShrink Tube 1.5mm/1.6mm',               6.0::numeric,  'BOM-LIST sheet: 4-Jet unit Signl Cbl Dest. Assy'),
      ('FAB-3DP-QX7-LCD-HOLD', NULL,                          'Thread locker 270',                         1.0::numeric,  'BOM-LIST sheet: CombineSFG row 564 (qty defaulted)'),
      ('FAB-3DP-X16-EXT-PILLER', 'MAC-ADH-290-4MTO8M',        'Sealant - Thread Locker 290',               1.0::numeric,  'BOM-LIST sheet: CombineSFG row 565 (qty defaulted)'),
      ('CRAFTBATTERYHOLD', NULL,                              'Silicon Hose 4mm x 8mm',                    1.0::numeric,  'BOM-LIST sheet: CombineSFG row 557 (qty defaulted)')
  ) AS t(parent_code, component_code, component_name, qty, source_note)
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
  SELECT i.id, i.code, i.name
  FROM public.items i
  WHERE i.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
),
resolved AS (
  SELECT
    pb.bom_id,
    COALESCE(ci_code.id, ci_name.id) AS component_item_id,
    ir.qty
  FROM input_rows ir
  JOIN parent_boms pb ON pb.parent_code = ir.parent_code
  LEFT JOIN component_items ci_code ON ir.component_code IS NOT NULL AND ci_code.code = ir.component_code
  LEFT JOIN component_items ci_name ON ci_name.name = ir.component_name
  WHERE ir.qty > 0
)
INSERT INTO public.bom_items (
  bom_id,
  item_id,
  quantity,
  created_at
)
SELECT
  r.bom_id,
  r.component_item_id,
  r.qty,
  NOW()
FROM resolved r
WHERE r.component_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.bom_items bi
    WHERE bi.bom_id = r.bom_id
      AND bi.item_id = r.component_item_id
  );

-- Post-check for the 5 parent codes
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
