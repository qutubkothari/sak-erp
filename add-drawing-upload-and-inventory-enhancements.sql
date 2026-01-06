-- Add drawing upload support and enhance inventory management
-- Migration: add-drawing-upload-and-inventory-enhancements.sql
-- Date: 2026-01-06

-- Add drawing_url column to items table if not exists
ALTER TABLE items
ADD COLUMN IF NOT EXISTS drawing_url TEXT,
ADD COLUMN IF NOT EXISTS drawing_file_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS current_stock DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock_level DECIMAL(15,2);

-- Add comment for clarity
COMMENT ON COLUMN items.drawing_url IS 'Supabase storage URL for item drawing/specification document';
COMMENT ON COLUMN items.drawing_file_name IS 'Original filename of uploaded drawing';
COMMENT ON COLUMN items.current_stock IS 'Current stock quantity (synced from inventory table)';
COMMENT ON COLUMN items.min_stock_level IS 'Minimum stock level before reorder alert (alias for reorder_level)';

-- Create function to sync current stock from inventory table
CREATE OR REPLACE FUNCTION sync_item_current_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the current_stock in items table when inventory changes
  UPDATE items
  SET current_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM inventory
    WHERE item_id = NEW.item_id
  )
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update current_stock
DROP TRIGGER IF EXISTS trigger_sync_item_stock ON inventory;
CREATE TRIGGER trigger_sync_item_stock
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION sync_item_current_stock();

-- Initial sync of current stock from inventory
UPDATE items i
SET current_stock = (
  SELECT COALESCE(SUM(inv.quantity), 0)
  FROM inventory inv
  WHERE inv.item_id = i.id
);

-- Copy reorder_level to min_stock_level for clarity
UPDATE items
SET min_stock_level = reorder_level
WHERE reorder_level IS NOT NULL AND min_stock_level IS NULL;

SELECT 'Migration completed successfully. Drawing upload support and inventory enhancements added.' as result;
