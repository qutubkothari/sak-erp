-- Controlled engineering revision packages and immutable PO drawing snapshots.
-- Additive/data-preserving: existing drawings and issued purchase orders are retained.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.item_drawings
  ADD COLUMN IF NOT EXISTS drawing_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS revision_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(40) NOT NULL DEFAULT 'DRAWING',
  ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_role VARCHAR(24),
  ADD COLUMN IF NOT EXISTS default_delivery_method VARCHAR(24);

UPDATE public.item_drawings
SET drawing_number = COALESCE(NULLIF(drawing_number, ''), 'DRW-' || item_id::text),
    revision_code = COALESCE(NULLIF(revision_code, ''), 'R' || version::text),
    lifecycle_status = CASE
      WHEN lifecycle_status IN ('APPROVED','RELEASED') THEN 'APPROVED'
      WHEN is_active THEN 'APPROVED'
      ELSE 'SUPERSEDED'
    END,
    approved_at = CASE WHEN is_active THEN COALESCE(approved_at, created_at) ELSE approved_at END,
    file_role = COALESCE(file_role, CASE
      WHEN lower(COALESCE(file_name,'')) ~ '\.(step|stp|dwg|dxf|iges|igs|ifc|stl|rvt|sldprt|sldasm|ipt|iam)$' THEN 'NATIVE_CAD'
      WHEN lower(COALESCE(file_name,'')) ~ '\.(pdf|png|jpe?g|tiff?|webp)$' THEN 'CONTROLLED_2D'
      ELSE 'SUPPORTING'
    END),
    default_delivery_method = COALESCE(default_delivery_method, CASE
      WHEN lower(COALESCE(file_name,'')) ~ '\.(pdf|png|jpe?g|tiff?|webp)$' THEN 'MERGE_PO'
      ELSE 'ATTACH_SEPARATELY'
    END)
WHERE drawing_number IS NULL OR revision_code IS NULL OR file_role IS NULL
   OR default_delivery_method IS NULL OR lifecycle_status IS NULL;

CREATE TABLE IF NOT EXISTS public.engineering_drawing_revision_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
  drawing_number VARCHAR(120) NOT NULL,
  revision_code VARCHAR(40) NOT NULL,
  title TEXT,
  lifecycle_status VARCHAR(24) NOT NULL DEFAULT 'DRAFT'
    CHECK (lifecycle_status IN ('DRAFT','SUBMITTED','APPROVED','SUPERSEDED','REJECTED')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, owner_item_id, drawing_number, revision_code)
);

ALTER TABLE public.item_drawings
  ADD COLUMN IF NOT EXISTS revision_package_id UUID
    REFERENCES public.engineering_drawing_revision_packages(id) ON DELETE RESTRICT;

INSERT INTO public.engineering_drawing_revision_packages
  (tenant_id, owner_item_id, drawing_number, revision_code, title,
   lifecycle_status, approved_by, approved_at, created_by, created_at, updated_at)
SELECT tenant_id, item_id, drawing_number, revision_code,
       max(file_name),
       CASE WHEN bool_or(lifecycle_status = 'APPROVED') THEN 'APPROVED'
            WHEN bool_or(lifecycle_status = 'SUBMITTED') THEN 'SUBMITTED'
            ELSE 'SUPERSEDED' END,
       (array_agg(approved_by) FILTER (WHERE approved_by IS NOT NULL))[1],
       max(approved_at),
       (array_agg(uploaded_by) FILTER (WHERE uploaded_by IS NOT NULL))[1],
       min(created_at), max(created_at)
FROM public.item_drawings
WHERE revision_package_id IS NULL
GROUP BY tenant_id, item_id, drawing_number, revision_code
ON CONFLICT (tenant_id, owner_item_id, drawing_number, revision_code) DO NOTHING;

UPDATE public.item_drawings d
SET revision_package_id = p.id
FROM public.engineering_drawing_revision_packages p
WHERE d.revision_package_id IS NULL
  AND p.tenant_id = d.tenant_id
  AND p.owner_item_id = d.item_id
  AND p.drawing_number = d.drawing_number
  AND p.revision_code = d.revision_code;

CREATE INDEX IF NOT EXISTS idx_drawing_packages_item_revision
  ON public.engineering_drawing_revision_packages
  (tenant_id, owner_item_id, lifecycle_status, drawing_number, revision_code);
CREATE INDEX IF NOT EXISTS idx_item_drawings_revision_package
  ON public.item_drawings (tenant_id, revision_package_id, lifecycle_status);

CREATE TABLE IF NOT EXISTS public.purchase_order_drawing_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  po_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id) ON DELETE RESTRICT,
  revision_package_id UUID REFERENCES public.engineering_drawing_revision_packages(id) ON DELETE RESTRICT,
  drawing_number VARCHAR(120) NOT NULL,
  revision_code VARCHAR(40) NOT NULL,
  lifecycle_status_at_selection VARCHAR(24) NOT NULL,
  selected_by UUID,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  explicitly_revised BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (tenant_id, po_item_id)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_drawing_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  po_drawing_package_id UUID NOT NULL
    REFERENCES public.purchase_order_drawing_packages(id) ON DELETE CASCADE,
  drawing_id UUID NOT NULL REFERENCES public.item_drawings(id) ON DELETE RESTRICT,
  delivery_method VARCHAR(24) NOT NULL
    CHECK (delivery_method IN ('MERGE_PO','ATTACH_SEPARATELY','EXCLUDE')),
  file_name_snapshot TEXT NOT NULL,
  file_url_snapshot TEXT NOT NULL,
  file_type_snapshot TEXT,
  file_size_snapshot BIGINT,
  content_hash_snapshot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, po_drawing_package_id, drawing_id)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_drawing_package_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  po_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
  revision_package_id UUID REFERENCES public.engineering_drawing_revision_packages(id) ON DELETE RESTRICT,
  drawing_number VARCHAR(120) NOT NULL,
  revision_code VARCHAR(40) NOT NULL,
  lifecycle_status_at_selection VARCHAR(24) NOT NULL,
  selected_by UUID,
  selected_at TIMESTAMPTZ NOT NULL,
  files_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_drawing_packages_po
  ON public.purchase_order_drawing_packages (tenant_id, po_id, po_item_id);
CREATE INDEX IF NOT EXISTS idx_po_drawing_files_package
  ON public.purchase_order_drawing_files (tenant_id, po_drawing_package_id);
CREATE INDEX IF NOT EXISTS idx_po_drawing_history_po
  ON public.purchase_order_drawing_package_history (tenant_id, po_id, po_item_id, archived_at);

COMMENT ON TABLE public.engineering_drawing_revision_packages IS
  'Correlates native CAD, controlled 2D and supporting files for one drawing number and revision.';
COMMENT ON TABLE public.purchase_order_drawing_packages IS
  'Immutable drawing revision selected for an individual PO line.';
COMMENT ON TABLE public.purchase_order_drawing_files IS
  'Exact frozen file set and delivery method issued with a PO line.';
COMMENT ON TABLE public.purchase_order_drawing_package_history IS
  'Prior immutable PO drawing packages retained whenever a PO drawing revision is explicitly changed.';

NOTIFY pgrst, 'reload schema';
