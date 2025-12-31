-- Update uid_count for existing GRN items based on actual UIDs in uid_registry
UPDATE grn_items 
SET 
  uid_count = (
    SELECT COUNT(*) 
    FROM uid_registry 
    WHERE uid_registry.grn_id = (SELECT grn_id FROM grn_items gi WHERE gi.id = grn_items.id)
      AND uid_registry.entity_id = (SELECT id FROM items WHERE items.code = grn_items.item_code)
  ),
  uid_generated = CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM uid_registry 
      WHERE uid_registry.grn_id = (SELECT grn_id FROM grn_items gi WHERE gi.id = grn_items.id)
        AND uid_registry.entity_id = (SELECT id FROM items WHERE items.code = grn_items.item_code)
    ) > 0 THEN true 
    ELSE false 
  END
WHERE EXISTS (
  SELECT 1 
  FROM uid_registry 
  WHERE uid_registry.grn_id = grn_items.grn_id
);

-- Show the results
SELECT 
  gi.item_code,
  gi.item_name,
  gi.accepted_qty,
  gi.uid_count,
  gi.uid_generated,
  g.grn_number
FROM grn_items gi
JOIN grn g ON gi.grn_id = g.id
WHERE gi.uid_count > 0
ORDER BY g.created_at DESC;
