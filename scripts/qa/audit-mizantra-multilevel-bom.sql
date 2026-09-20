\pset pager off

SELECT
  parent.code AS parent_code,
  parent.name AS parent_name,
  bh.id AS bom_id,
  COUNT(*) AS component_lines,
  COUNT(*) FILTER (
    WHERE bi.child_bom_id IS NOT NULL OR child_bom.id IS NOT NULL
  ) AS subassembly_lines,
  COUNT(*) FILTER (
    WHERE bi.child_bom_id IS NULL AND child_bom.id IS NULL
  ) AS direct_item_lines
FROM bom_headers bh
JOIN items parent ON parent.id = bh.item_id
JOIN bom_items bi ON bi.bom_id = bh.id
LEFT JOIN bom_headers child_bom
  ON child_bom.tenant_id = bh.tenant_id
 AND child_bom.item_id = bi.item_id
 AND child_bom.is_active = TRUE
WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND bh.is_active = TRUE
GROUP BY parent.code, parent.name, bh.id
ORDER BY subassembly_lines DESC, parent.code;

SELECT
  parent.code AS parent_code,
  bi.sequence,
  component.code AS component_code,
  component.name AS component_name,
  bi.quantity,
  bi.supply_policy,
  COALESCE(explicit_child.code, inferred_child.code) AS child_bom_item_code
FROM bom_headers bh
JOIN items parent ON parent.id = bh.item_id
JOIN bom_items bi ON bi.bom_id = bh.id
LEFT JOIN items component ON component.id = bi.item_id
LEFT JOIN bom_headers explicit_header ON explicit_header.id = bi.child_bom_id
LEFT JOIN items explicit_child ON explicit_child.id = explicit_header.item_id
LEFT JOIN bom_headers inferred_header
  ON inferred_header.tenant_id = bh.tenant_id
 AND inferred_header.item_id = bi.item_id
 AND inferred_header.is_active = TRUE
LEFT JOIN items inferred_child ON inferred_child.id = inferred_header.item_id
WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND bh.is_active = TRUE
  AND parent.code = '700-0002'
ORDER BY bi.sequence;

SELECT parent.id AS item_id, parent.code, parent.name, bh.id AS bom_id
FROM bom_headers bh
JOIN items parent ON parent.id = bh.item_id
WHERE bh.tenant_id = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c'
  AND bh.is_active = TRUE
  AND parent.code = 'ITM-SAIFSEAS-LIFE-FINAL-ASSY-FG';
