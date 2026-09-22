ALTER TABLE public.subcontract_route_steps
  ADD COLUMN IF NOT EXISTS standard_output_per_input NUMERIC(18, 6);

ALTER TABLE public.subcontract_orders
  ADD COLUMN IF NOT EXISTS standard_calculated_output_qty NUMERIC(18, 4);