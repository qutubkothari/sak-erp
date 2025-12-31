-- Check BX992 BOM structure
SELECT 
  bh.id as bom_id,
  i.code as product_code,
  i.name as product_name,
  bi.id as bom_item_id,
  bi.component_type,
  bi.quantity,
  COALESCE(ci.code, cbi.code) as component_code,
  COALESCE(ci.name, cbi.name) as component_name,
  bi.item_id,
  bi.child_bom_id
FROM bom_headers bh
JOIN items i ON bh.item_id = i.id
LEFT JOIN bom_items bi ON bh.id = bi.bom_id
LEFT JOIN items ci ON bi.item_id = ci.id
LEFT JOIN bom_headers cbh ON bi.child_bom_id = cbh.id
LEFT JOIN items cbi ON cbh.item_id = cbi.id
WHERE i.code = 'FG1'
ORDER BY bi.sequence;

-- To fix SG2 to be a BOM component instead of ITEM:
-- First, find the SG2 BOM ID
-- SELECT id FROM bom_headers WHERE item_id = (SELECT id FROM items WHERE code = 'SG2');

-- Then update the bom_items record:
-- UPDATE bom_items 
-- SET 
--   component_type = 'BOM',
--   child_bom_id = '<SG2_BOM_ID>',
--   item_id = NULL
-- WHERE bom_id = '<BX992_BOM_ID>' 
--   AND item_id = '<SG2_ITEM_ID>';
