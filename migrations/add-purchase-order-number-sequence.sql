-- Durable, tenant-scoped PO numbering.
-- The counter is intentionally independent of purchase_orders rows so deletion
-- cannot make an issued number available again.
CREATE TABLE IF NOT EXISTS public.document_number_sequences (
  tenant_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  last_issued_number BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, document_type)
);

CREATE OR REPLACE FUNCTION public.allocate_document_number(
  p_tenant_id UUID,
  p_document_type TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO public.document_number_sequences (tenant_id, document_type, last_issued_number)
  VALUES (
    p_tenant_id,
    p_document_type,
    COALESCE((
      SELECT MAX((regexp_match(po_number, '^PO-[0-9]{4}-[0-9]{2}-([0-9]+)$'))[1]::BIGINT)
      FROM public.purchase_orders
      WHERE tenant_id = p_tenant_id
        AND po_number ~ '^PO-[0-9]{4}-[0-9]{2}-[0-9]+$'
    ), 0)
  )
  ON CONFLICT (tenant_id, document_type) DO NOTHING;

  UPDATE public.document_number_sequences
  SET last_issued_number = last_issued_number + 1,
      updated_at = NOW()
  WHERE tenant_id = p_tenant_id
    AND document_type = p_document_type
  RETURNING last_issued_number INTO v_next;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.allocate_document_number(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_document_number(UUID, TEXT) TO service_role;