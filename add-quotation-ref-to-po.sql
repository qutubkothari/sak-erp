-- Add quotation_ref column to purchase_orders table
ALTER TABLE purchase_orders
ADD COLUMN IF NOT EXISTS quotation_ref VARCHAR(100);
