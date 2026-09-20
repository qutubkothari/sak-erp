-- Adds admin verification gates for Vendor Master and Stock Master.
-- Existing records are backfilled as verified to avoid interrupting live operations;
-- newly-created records default to unverified until an admin approves them.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS is_verified boolean,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

UPDATE public.vendors
SET is_verified = true,
    verified_at = COALESCE(verified_at, updated_at, created_at, now())
WHERE is_verified IS NULL;

ALTER TABLE public.vendors
  ALTER COLUMN is_verified SET DEFAULT false,
  ALTER COLUMN is_verified SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendors_tenant_verified
  ON public.vendors (tenant_id, is_verified);

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS is_verified boolean,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid;

UPDATE public.items
SET is_verified = true,
    verified_at = COALESCE(verified_at, updated_at, created_at, now())
WHERE is_verified IS NULL;

ALTER TABLE public.items
  ALTER COLUMN is_verified SET DEFAULT false,
  ALTER COLUMN is_verified SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_tenant_verified
  ON public.items (tenant_id, is_verified);