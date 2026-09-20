-- Add product_category field to items
ALTER TABLE items
ADD COLUMN IF NOT EXISTS product_category text;
