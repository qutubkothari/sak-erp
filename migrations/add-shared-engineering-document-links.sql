-- Store an engineering file once and associate it with every applicable item.
-- Additive/data-preserving: existing item drawing rows and storage objects remain unchanged.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.item_drawings
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_item_drawings_content_hash
  ON public.item_drawings (tenant_id, content_hash)
  WHERE content_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.engineering_drawing_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  drawing_id UUID NOT NULL REFERENCES public.item_drawings(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'APPLICABLE'
    CHECK (relation_type IN ('OWNER','APPLICABLE')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT engineering_drawing_item_links_unique
    UNIQUE (tenant_id, drawing_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_engineering_drawing_item_links_item
  ON public.engineering_drawing_item_links (tenant_id, item_id, drawing_id);

-- Every historical drawing retains its original item as its owner link.
INSERT INTO public.engineering_drawing_item_links
  (tenant_id, drawing_id, item_id, relation_type, created_at)
SELECT tenant_id, id, item_id, 'OWNER', COALESCE(created_at, now())
FROM public.item_drawings
ON CONFLICT (tenant_id, drawing_id, item_id) DO NOTHING;

COMMENT ON TABLE public.engineering_drawing_item_links IS
  'Many-to-many item coverage for one physically stored engineering drawing revision.';
COMMENT ON COLUMN public.item_drawings.content_hash IS
  'Client-calculated SHA-256 used to detect identical engineering-file uploads.';
