-- Fix BX992 BOM - Convert SG2 (Here3+GPS) from ITEM to BOM component
-- This script will update the BOM so that SG2 properly explodes during PR generation

-- Step 1: Find the IDs we need
DO $$
DECLARE
  v_bx992_bom_id UUID;
  v_sg2_item_id UUID;
  v_sg2_bom_id UUID;
  v_bom_item_id UUID;
BEGIN
  -- Get BX992 BOM ID (FG1 - BX992 Tremble GPS)
  SELECT bh.id INTO v_bx992_bom_id
  FROM bom_headers bh
  JOIN items i ON bh.item_id = i.id
  WHERE i.code = 'FG1'
  LIMIT 1;

  -- Get SG2 item ID
  SELECT id INTO v_sg2_item_id
  FROM items
  WHERE code = 'SG2'
  LIMIT 1;

  -- Get SG2 BOM ID (the Here3+GPS BOM)
  SELECT id INTO v_sg2_bom_id
  FROM bom_headers
  WHERE item_id = v_sg2_item_id
  LIMIT 1;

  -- Find the bom_item that needs to be fixed
  SELECT id INTO v_bom_item_id
  FROM bom_items
  WHERE bom_id = v_bx992_bom_id
    AND item_id = v_sg2_item_id
    AND component_type = 'ITEM';

  -- Show what we found
  RAISE NOTICE 'BX992 BOM ID: %', v_bx992_bom_id;
  RAISE NOTICE 'SG2 Item ID: %', v_sg2_item_id;
  RAISE NOTICE 'SG2 BOM ID: %', v_sg2_bom_id;
  RAISE NOTICE 'BOM Item to fix ID: %', v_bom_item_id;

  -- Update the component from ITEM to BOM
  IF v_bom_item_id IS NOT NULL AND v_sg2_bom_id IS NOT NULL THEN
    UPDATE bom_items
    SET 
      component_type = 'BOM',
      child_bom_id = v_sg2_bom_id,
      item_id = NULL,
      updated_at = NOW()
    WHERE id = v_bom_item_id;
    
    RAISE NOTICE '✓ Fixed! SG2 is now a BOM component in BX992';
  ELSE
    RAISE NOTICE '✗ Could not find the records to fix. Check if BOMs exist.';
  END IF;
END $$;

-- Verify the fix
SELECT 
  i.code as product,
  bi.component_type,
  bi.quantity,
  COALESCE(ci.code, cbi.code) as component,
  CASE 
    WHEN bi.component_type = 'BOM' THEN '(will explode)'
    ELSE ''
  END as note
FROM bom_headers bh
JOIN items i ON bh.item_id = i.id
LEFT JOIN bom_items bi ON bh.id = bi.bom_id
LEFT JOIN items ci ON bi.item_id = ci.id
LEFT JOIN bom_headers cbh ON bi.child_bom_id = cbh.id
LEFT JOIN items cbi ON cbh.item_id = cbi.id
WHERE i.code = 'FG1'
ORDER BY bi.sequence;
