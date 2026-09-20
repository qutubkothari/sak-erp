-- Link item_drawings rows to central documents (optional)
-- Safe to run multiple times.

ALTER TABLE IF EXISTS item_drawings
  ADD COLUMN IF NOT EXISTS document_id UUID;

-- Optional foreign key
-- Note: Postgres does NOT support "ADD CONSTRAINT IF NOT EXISTS", so we guard with pg_constraint.
DO $$
BEGIN
  IF to_regclass('public.item_drawings') IS NULL THEN
    RAISE NOTICE 'Table public.item_drawings does not exist; skipping FK.';
    RETURN;
  END IF;

  IF to_regclass('public.documents') IS NULL THEN
    RAISE NOTICE 'Table public.documents does not exist; skipping FK.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'item_drawings_document_id_fkey'
  ) THEN
    ALTER TABLE public.item_drawings
      ADD CONSTRAINT item_drawings_document_id_fkey
      FOREIGN KEY (document_id) REFERENCES public.documents(id)
      ON DELETE SET NULL;
  END IF;
END $$;
