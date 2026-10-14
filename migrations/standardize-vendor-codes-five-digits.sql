-- Preserve vendor IDs and document links while changing the displayed master code.
-- Apply in one transaction after deploying the API that generates VEN-00001 style codes.
CREATE TABLE IF NOT EXISTS public.vendor_code_change_audit (
  vendor_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  old_code text NOT NULL,
  new_code text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vendor_id, old_code, new_code)
);

LOCK TABLE public.vendors IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  tenant record;
  vendor record;
  used_numbers integer[];
  next_number integer;
  requested_number integer;
  assigned_number integer;
  new_code text;
BEGIN
  FOR tenant IN SELECT DISTINCT tenant_id FROM public.vendors ORDER BY tenant_id LOOP
    SELECT COALESCE(array_agg((substring(code from 5))::integer), ARRAY[]::integer[])
      INTO used_numbers
    FROM public.vendors
    WHERE tenant_id = tenant.tenant_id AND code ~ '^VEN-[0-9]{5}$';

    SELECT COALESCE(max((substring(code from '^VEN-?([0-9]+)$'))::integer), 0) + 1
      INTO next_number
    FROM public.vendors
    WHERE tenant_id = tenant.tenant_id AND code ~ '^VEN-?[0-9]{1,5}$';

    FOR vendor IN
      SELECT id, code FROM public.vendors
      WHERE tenant_id = tenant.tenant_id AND (code IS NULL OR code !~ '^VEN-[0-9]{5}$')
      ORDER BY created_at NULLS LAST, id
    LOOP
      requested_number := NULL;
      IF upper(trim(vendor.code)) ~ '^VEN-?[0-9]{1,5}$' THEN
        requested_number := (substring(upper(trim(vendor.code)) from '^VEN-?([0-9]+)$'))::integer;
      END IF;

      IF requested_number BETWEEN 1 AND 99999 AND NOT requested_number = ANY(used_numbers) THEN
        assigned_number := requested_number;
      ELSE
        WHILE next_number = ANY(used_numbers) LOOP
          next_number := next_number + 1;
        END LOOP;
        assigned_number := next_number;
        next_number := next_number + 1;
      END IF;

      IF assigned_number > 99999 THEN
        RAISE EXCEPTION 'Five-digit vendor code range exhausted for tenant %', tenant.tenant_id;
      END IF;

      new_code := 'VEN-' || lpad(assigned_number::text, 5, '0');
      INSERT INTO public.vendor_code_change_audit (vendor_id, tenant_id, old_code, new_code)
      VALUES (vendor.id, tenant.tenant_id, COALESCE(vendor.code, ''), new_code)
      ON CONFLICT DO NOTHING;
      UPDATE public.vendors SET code = new_code WHERE id = vendor.id AND tenant_id = tenant.tenant_id;
      used_numbers := array_append(used_numbers, assigned_number);
    END LOOP;
  END LOOP;
END;
$$;

-- Accounting party codes are a live lookup copy only when linked by vendor ID.
DO $$
BEGIN
  IF to_regclass('public.accounting_parties') IS NOT NULL THEN
    UPDATE public.accounting_parties AS party
       SET party_code = vendor.code
      FROM public.vendors AS vendor
     WHERE party.party_type = 'SUPPLIER'
       AND party.party_id = vendor.id
       AND party.tenant_id = vendor.tenant_id
       AND party.party_code IS DISTINCT FROM vendor.code;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.vendors'::regclass
      AND conname = 'vendors_code_five_digits_check'
  ) THEN
    ALTER TABLE public.vendors
      ADD CONSTRAINT vendors_code_five_digits_check
      CHECK (code IS NOT NULL AND code ~ '^VEN-[0-9]{5}$') NOT VALID;
  END IF;
END;
$$;
ALTER TABLE public.vendors VALIDATE CONSTRAINT vendors_code_five_digits_check;
NOTIFY pgrst, 'reload schema';
