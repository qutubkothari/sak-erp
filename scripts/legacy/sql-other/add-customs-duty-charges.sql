-- Add customs duty and other charges to purchase_orders table
-- These fields will affect the grand total calculation

-- Add customs_duty column (numeric with 2 decimal places)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS customs_duty NUMERIC(15,2) DEFAULT 0;

-- Add other_charges column (numeric with 2 decimal places)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS other_charges NUMERIC(15,2) DEFAULT 0;

-- Add notes column for charge descriptions
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS charge_notes TEXT;

-- Note: Grand total calculation will be: 
-- items_subtotal + tax + customs_duty + other_charges
