-- Allow one file per role within a drawing revision.
-- Existing drawing rows are preserved; approval, package, and file data are untouched.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.item_drawings
    WHERE file_role IS NULL OR btrim(file_role) = ''
  ) THEN
    RAISE EXCEPTION 'Cannot enforce drawing role uniqueness: item_drawings contains NULL or blank file_role values';
  END IF;
END
$$;

ALTER TABLE public.item_drawings
  ALTER COLUMN file_role SET NOT NULL;

DROP INDEX IF EXISTS public.uq_item_drawing_revision;

CREATE UNIQUE INDEX uq_item_drawing_revision_role
  ON public.item_drawings (tenant_id, item_id, drawing_number, revision_code, file_role);

NOTIFY pgrst, 'reload schema';
