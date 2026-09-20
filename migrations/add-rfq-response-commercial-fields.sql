-- RFQ response commercial inputs used before converting an approved supplier quote to a PO.
ALTER TABLE public.rfq_items
  ADD COLUMN IF NOT EXISTS vendor_discount_percent NUMERIC(7,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_gst_percent NUMERIC(7,3) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rfq_items_vendor_discount_percent_check'
      AND conrelid = 'public.rfq_items'::regclass
  ) THEN
    ALTER TABLE public.rfq_items
      ADD CONSTRAINT rfq_items_vendor_discount_percent_check
      CHECK (vendor_discount_percent >= 0 AND vendor_discount_percent <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rfq_items_vendor_gst_percent_check'
      AND conrelid = 'public.rfq_items'::regclass
  ) THEN
    ALTER TABLE public.rfq_items
      ADD CONSTRAINT rfq_items_vendor_gst_percent_check
      CHECK (vendor_gst_percent >= 0 AND vendor_gst_percent <= 100);
  END IF;
END
$$;

COMMENT ON COLUMN public.rfq_items.vendor_discount_percent IS
  'Supplier discount percentage entered against the RFQ response line.';
COMMENT ON COLUMN public.rfq_items.vendor_gst_percent IS
  'Supplier GST percentage entered against the RFQ response line.';

NOTIFY pgrst, 'reload schema';
