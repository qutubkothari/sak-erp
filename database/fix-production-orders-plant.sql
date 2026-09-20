-- Add missing columns to production_orders table
-- These are needed for proper shop floor routing integration

-- Add plant_code column (production service uses VARCHAR plant_code instead of UUID plant_id)
ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS plant_code VARCHAR(20);

-- Add bom_id column (required to link production orders with routing/BOM)
ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS bom_id UUID;

-- Add produced_quantity column (tracks how many units completed)
ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS produced_quantity DECIMAL(12,2) DEFAULT 0;

-- Add actual start/end dates
ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS actual_start_date TIMESTAMP;

ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMP;

-- Add comments
COMMENT ON COLUMN production_orders.plant_code IS 'Plant code for the production order (e.g., KOL, MUM, DEL)';
COMMENT ON COLUMN production_orders.bom_id IS 'Bill of Materials reference - links to bom_headers table';
COMMENT ON COLUMN production_orders.produced_quantity IS 'Quantity of units produced/completed so far';

-- Update existing records to use a default plant code
UPDATE production_orders 
SET plant_code = 'KOL' 
WHERE plant_code IS NULL;

-- Create index for BOM lookup
CREATE INDEX IF NOT EXISTS idx_prod_orders_bom ON production_orders(bom_id);
