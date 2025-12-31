-- Check and fix purchase_order_items to items relationship

-- First, check if foreign key exists
SELECT 
    constraint_name, 
    table_name, 
    column_name,
    constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'purchase_order_items' 
    AND kcu.column_name = 'item_id'
    AND tc.constraint_type = 'FOREIGN KEY';

-- If no result above, add the foreign key
ALTER TABLE purchase_order_items 
DROP CONSTRAINT IF EXISTS fk_purchase_order_items_item_id;

ALTER TABLE purchase_order_items
ADD CONSTRAINT fk_purchase_order_items_item_id 
FOREIGN KEY (item_id) 
REFERENCES items(id) 
ON DELETE RESTRICT;

-- Verify it was created
SELECT 
    constraint_name, 
    table_name, 
    column_name
FROM information_schema.key_column_usage
WHERE table_name = 'purchase_order_items' 
    AND column_name = 'item_id';
