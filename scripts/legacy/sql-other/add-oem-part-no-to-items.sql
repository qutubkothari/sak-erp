-- Add OEM Part No. to Stock Master items.
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS oem_part_no VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_items_oem_part_no
  ON public.items (tenant_id, oem_part_no)
  WHERE oem_part_no IS NOT NULL;
