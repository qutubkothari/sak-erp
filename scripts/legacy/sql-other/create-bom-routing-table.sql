-- Create bom_routing table for BOM routing steps/operations
CREATE TABLE IF NOT EXISTS public.bom_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bom_id UUID NOT NULL REFERENCES public.bom_headers(id) ON DELETE CASCADE,
  operation_sequence INTEGER NOT NULL,
  operation_name VARCHAR(255),
  workstation_id UUID REFERENCES public.work_stations(id),
  cycle_time DECIMAL(10, 2),
  setup_time DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for lookups
CREATE INDEX idx_bom_routing_bom_id ON public.bom_routing(bom_id);
CREATE INDEX idx_bom_routing_tenant_id ON public.bom_routing(tenant_id);

-- Enable RLS
ALTER TABLE public.bom_routing ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "tenant_isolation_bom_routing" ON public.bom_routing
  USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

COMMENT ON TABLE public.bom_routing IS 'Stores routing/operation steps for BOMs';
COMMENT ON COLUMN public.bom_routing.operation_sequence IS 'Order in which operations are performed';
COMMENT ON COLUMN public.bom_routing.cycle_time IS 'Time in hours to complete the operation';
COMMENT ON COLUMN public.bom_routing.setup_time IS 'Setup time in hours for the operation';
