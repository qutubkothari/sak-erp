ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS length NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS width NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS thickness NUMERIC(18,6),
  ADD COLUMN IF NOT EXISTS dimension_uom VARCHAR(20);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_dimensions_positive') THEN
    ALTER TABLE public.items ADD CONSTRAINT items_dimensions_positive CHECK (
      (length IS NULL OR length > 0) AND (width IS NULL OR width > 0) AND (thickness IS NULL OR thickness > 0)
    ) NOT VALID;
  END IF;
END $$;