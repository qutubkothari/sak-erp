-- Add attachments JSONB column to purchase_orders table
-- This stores direct PO document/quotation attachments as an array of {url, name} objects

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN purchase_orders.attachments IS
  'Array of document attachments for this PO. Format: [{url: string, name: string}]';
