-- Required by the governed Super Admin drawing-delete workflow.
-- Some older live databases received the lifecycle fields without metadata.
ALTER TABLE public.item_drawings
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.item_drawings.metadata IS
  'Engineering drawing lifecycle and audit metadata, including governed deletion identity.';

NOTIFY pgrst, 'reload schema';
