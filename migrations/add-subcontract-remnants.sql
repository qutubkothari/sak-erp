CREATE TABLE IF NOT EXISTS public.subcontract_remnants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subcontract_order_id UUID NOT NULL REFERENCES public.subcontract_orders(id) ON DELETE CASCADE,
  receipt_movement_id UUID REFERENCES public.subcontract_movements(id) ON DELETE CASCADE,
  order_step_id UUID REFERENCES public.subcontract_order_steps(id) ON DELETE SET NULL,
  source_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  length NUMERIC(18,6) NOT NULL CHECK (length > 0),
  width NUMERIC(18,6) NOT NULL CHECK (width > 0),
  thickness NUMERIC(18,6) NOT NULL CHECK (thickness > 0),
  dimension_uom VARCHAR(20) NOT NULL,
  quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  reusable BOOLEAN NOT NULL DEFAULT true,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subcontract_remnants_order ON public.subcontract_remnants(tenant_id, subcontract_order_id);