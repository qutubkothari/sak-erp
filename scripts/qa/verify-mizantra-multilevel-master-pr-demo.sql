\pset pager off
SELECT i.id AS demo_item_id, i.code, i.name
FROM public.items i
WHERE i.tenant_id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid
  AND i.code='DEMO-ML-FG-001';

SELECT
  count(*) FILTER (WHERE bi.component_type='BOM') AS subassemblies,
  count(*) FILTER (WHERE bi.component_type='ITEM') AS direct_items,
  count(*) AS total_top_lines
FROM public.bom_headers bh
JOIN public.items parent ON parent.id=bh.item_id
JOIN public.bom_items bi ON bi.bom_id=bh.id
WHERE bh.tenant_id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid
  AND parent.code='DEMO-ML-FG-001' AND bh.is_active=true;

SELECT
  child.code,
  child.name,
  bi.supply_policy,
  bi.quantity,
  COALESCE(max(se.available_quantity),0) AS available_stock,
  count(child_line.id) AS child_component_lines
FROM public.bom_headers parent_bom
JOIN public.items parent ON parent.id=parent_bom.item_id
JOIN public.bom_items bi ON bi.bom_id=parent_bom.id AND bi.component_type='BOM'
JOIN public.bom_headers child_bom ON child_bom.id=bi.child_bom_id
JOIN public.items child ON child.id=child_bom.item_id
LEFT JOIN public.bom_items child_line ON child_line.bom_id=child_bom.id
LEFT JOIN public.stock_entries se
  ON se.tenant_id=parent_bom.tenant_id AND se.item_id=child.id
WHERE parent_bom.tenant_id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid
  AND parent.code='DEMO-ML-FG-001' AND parent_bom.is_active=true
GROUP BY child.code, child.name, bi.supply_policy, bi.quantity, bi.sequence
ORDER BY bi.sequence;

SELECT i.code, sum(se.available_quantity) AS available_stock
FROM public.items i
JOIN public.stock_entries se ON se.item_id=i.id AND se.tenant_id=i.tenant_id
WHERE i.tenant_id='f87a5ab0-0619-4f1c-bab9-e78ca750e56c'::uuid
  AND i.metadata->>'demoPack'='MIZANTRA_MULTI_LEVEL_MASTER_PR_V1'
GROUP BY i.code
ORDER BY i.code;
