-- Add OEM Part No. and OEM Name to items table
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS oem_part_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS oem_name VARCHAR(200);

-- Create indexes for faster searching
CREATE INDEX IF NOT EXISTS idx_items_oem_part_no
  ON public.items (tenant_id, oem_part_no)
  WHERE oem_part_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_oem_name
  ON public.items (tenant_id, oem_name)
  WHERE oem_name IS NOT NULL;
