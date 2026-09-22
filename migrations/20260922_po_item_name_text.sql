-- Preserve full engineering item names during PR-to-PO conversion.
ALTER TABLE public.purchase_order_items
  ALTER COLUMN item_name TYPE text;