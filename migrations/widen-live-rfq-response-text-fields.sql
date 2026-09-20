-- RFQ response remarks, metadata and item descriptions can exceed the legacy
-- 200-character limits present in older production databases.
-- These changes are lossless and safe to re-run.

ALTER TABLE public.rfqs
  ALTER COLUMN notes TYPE text USING notes::text;

ALTER TABLE public.rfq_items
  ALTER COLUMN item_name TYPE text USING item_name::text,
  ALTER COLUMN vendor_notes TYPE text USING vendor_notes::text;

