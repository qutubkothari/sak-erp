-- Preserve the supplier's contractual amount separately from the tenant's
-- functional-currency amount. Existing records remain unclassified; they must
-- be reviewed rather than silently treated as converted foreign purchases.
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS transaction_currency_code varchar(3),
  ADD COLUMN IF NOT EXISTS functional_currency_code varchar(3),
  ADD COLUMN IF NOT EXISTS booking_exchange_rate numeric(20, 8),
  ADD COLUMN IF NOT EXISTS booking_exchange_rate_source text,
  ADD COLUMN IF NOT EXISTS exchange_rate_date date,
  ADD COLUMN IF NOT EXISTS transaction_items_subtotal numeric(20, 4);

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS transaction_unit_price numeric(20, 4),
  ADD COLUMN IF NOT EXISTS transaction_amount numeric(20, 4);

ALTER TABLE public.grns
  ADD COLUMN IF NOT EXISTS transaction_currency_code varchar(3),
  ADD COLUMN IF NOT EXISTS functional_currency_code varchar(3),
  ADD COLUMN IF NOT EXISTS booking_exchange_rate numeric(20, 8),
  ADD COLUMN IF NOT EXISTS recognition_rate_source text,
  ADD COLUMN IF NOT EXISTS recognition_rate_date date,
  ADD COLUMN IF NOT EXISTS transaction_gross_amount numeric(20, 4),
  ADD COLUMN IF NOT EXISTS transaction_net_payable_amount numeric(20, 4);

ALTER TABLE public.grn_payment_entries
  ADD COLUMN IF NOT EXISTS transaction_currency_code varchar(3),
  ADD COLUMN IF NOT EXISTS transaction_amount numeric(20, 4),
  ADD COLUMN IF NOT EXISTS payment_exchange_rate numeric(20, 8),
  ADD COLUMN IF NOT EXISTS payment_exchange_rate_source text,
  ADD COLUMN IF NOT EXISTS accounting_journal_id uuid REFERENCES public.accounting_journals(id),
  ADD COLUMN IF NOT EXISTS cash_amount_functional numeric(20, 2),
  ADD COLUMN IF NOT EXISTS realized_fx_amount_functional numeric(20, 2);

CREATE UNIQUE INDEX IF NOT EXISTS uq_arwa_grn_payment_journal
  ON public.grn_payment_entries (tenant_id, accounting_journal_id)
  WHERE accounting_journal_id IS NOT NULL;

ALTER TABLE public.grn_payment_reversals
  ADD COLUMN IF NOT EXISTS reversal_journal_id uuid REFERENCES public.accounting_journals(id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'purchase_orders_booking_exchange_rate_positive'
      AND conrelid = 'public.purchase_orders'::regclass
  ) THEN
    ALTER TABLE public.purchase_orders
      ADD CONSTRAINT purchase_orders_booking_exchange_rate_positive
      CHECK (booking_exchange_rate IS NULL OR booking_exchange_rate > 0);
  END IF;
END $$;

-- A FIFO layer needs more precision than the legacy two-decimal unit price
-- when a two-decimal landed-cost pool is spread over several units.
ALTER TABLE public.stock_entries ALTER COLUMN unit_price TYPE numeric(20, 8);
ALTER TABLE public.inventory_cost_events ALTER COLUMN unit_cost TYPE numeric(20, 8);
ALTER TABLE public.grn_items ALTER COLUMN rate TYPE numeric(20, 8);

-- A sanctioned USD invoice must have exactly one finance voucher, even when
-- two administrators submit the same action concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS uq_arwa_usd_purchase_invoice_journal
  ON public.accounting_journals (tenant_id, source_id)
  WHERE source_type = 'PURCHASE_INVOICE' AND transaction_currency_code = 'USD';

CREATE UNIQUE INDEX IF NOT EXISTS uq_arwa_usd_supplier_payment_reversal
  ON public.accounting_journals (tenant_id, reversal_of_id)
  WHERE source_type = 'REVERSAL' AND transaction_currency_code = 'USD' AND reversal_of_id IS NOT NULL;

-- Super Admin approved this ARWA finance account on 11 October 2026.
-- It remains inactive as a posting destination until the journal workflow is
-- configured and the complete supplier payment test has passed.
INSERT INTO public.accounting_accounts
  (tenant_id, account_code, account_name, account_type, account_subtype,
   parent_id, currency_code, is_group, is_active)
SELECT t.id, '4311', 'Foreign exchange gain', 'REVENUE', 'FX_GAIN', parent.id,
       'EGP', false, true
FROM public.tenants t
JOIN public.accounting_accounts parent
  ON parent.tenant_id = t.id AND parent.account_code = '4000'
WHERE (upper(coalesce(t.market_profile, '')) = 'EGYPT' OR upper(coalesce(t.default_currency, '')) = 'EGP')
  AND NOT EXISTS (SELECT 1 FROM public.accounting_accounts existing
                  WHERE existing.tenant_id = t.id AND existing.account_code = '4311');

CREATE OR REPLACE FUNCTION public.post_arwa_import_landed_cost(
  p_tenant_id uuid, p_import_file_id uuid, p_user_id uuid,
  p_allocations jsonb, p_pool numeric
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  file_row public.import_files%ROWTYPE;
  allocation record;
  receipt record;
  layer record;
  stock_qty numeric;
  available_qty numeric;
  distributed numeric;
  share_amount numeric;
  row_count integer := 0;
  total_allocated numeric := 0;
  layer_index integer;
  layer_count integer;
BEGIN
  SELECT * INTO file_row FROM public.import_files
    WHERE id = p_import_file_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Import file not found'; END IF;
  IF file_row.status = 'LANDED_COST_POSTED' THEN RAISE EXCEPTION 'Landed cost is already posted'; END IF;
  IF upper(file_row.currency) <> 'USD' THEN RAISE EXCEPTION 'ARWA import file must be in USD'; END IF;
  IF p_pool <= 0 OR jsonb_typeof(p_allocations) <> 'array' OR jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'A positive landed-cost pool and linked GRN lines are required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.import_file_grn_allocations
             WHERE tenant_id = p_tenant_id AND import_file_id = p_import_file_id) THEN
    RAISE EXCEPTION 'Prior allocations exist; review before posting';
  END IF;

  FOR allocation IN SELECT * FROM jsonb_to_recordset(p_allocations) AS x(
    import_file_grn_id uuid, grn_id uuid, grn_item_id uuid, item_id uuid,
    item_code text, item_name text, received_qty numeric, base_rate numeric,
    base_value numeric, allocated_landed_cost numeric, allocation_basis text
  ) LOOP
    row_count := row_count + 1;
    IF allocation.allocated_landed_cost < 0 OR allocation.received_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid landed-cost allocation';
    END IF;
    SELECT gi.id, gi.item_id, gi.accepted_qty, gi.grn_id INTO receipt
      FROM public.grn_items gi
      JOIN public.import_file_grns link ON link.grn_id = gi.grn_id
      WHERE gi.id = allocation.grn_item_id AND gi.tenant_id = p_tenant_id
        AND link.id = allocation.import_file_grn_id
        AND link.import_file_id = p_import_file_id AND link.tenant_id = p_tenant_id
        AND gi.grn_id = allocation.grn_id;
    IF NOT FOUND OR receipt.item_id IS DISTINCT FROM allocation.item_id
      OR abs(coalesce(receipt.accepted_qty, 0) - allocation.received_qty) > 0.001 THEN
      RAISE EXCEPTION 'Allocation does not match a fully accepted linked GRN line';
    END IF;
    IF EXISTS (SELECT 1 FROM public.import_file_grn_allocations a
               WHERE a.tenant_id = p_tenant_id AND a.grn_item_id = allocation.grn_item_id) THEN
      RAISE EXCEPTION 'This GRN line already has a landed-cost allocation';
    END IF;
    SELECT coalesce(sum(quantity), 0), coalesce(sum(available_quantity), 0), count(*)
      INTO stock_qty, available_qty, layer_count
      FROM public.stock_entries
      WHERE tenant_id = p_tenant_id AND item_id = allocation.item_id
        AND metadata->>'grn_item_id' = allocation.grn_item_id::text;
    IF layer_count = 0 OR abs(stock_qty - allocation.received_qty) > 0.001
      OR abs(available_qty - stock_qty) > 0.001 THEN
      RAISE EXCEPTION 'GRN stock layer is missing or has been consumed; landed cost cannot be retroactively posted';
    END IF;
    distributed := 0;
    layer_index := 0;
    FOR layer IN SELECT id, quantity, unit_price, metadata FROM public.stock_entries
      WHERE tenant_id = p_tenant_id AND item_id = allocation.item_id
        AND metadata->>'grn_item_id' = allocation.grn_item_id::text
      ORDER BY id FOR UPDATE
    LOOP
      layer_index := layer_index + 1;
      share_amount := CASE WHEN layer_index = layer_count
        THEN allocation.allocated_landed_cost - distributed
        ELSE round(allocation.allocated_landed_cost * layer.quantity / stock_qty, 2) END;
      distributed := distributed + share_amount;
      UPDATE public.stock_entries
        SET unit_price = round(layer.unit_price + share_amount / layer.quantity, 8),
            metadata = coalesce(layer.metadata, '{}'::jsonb) ||
              jsonb_build_object('landed_cost_import_file_id', p_import_file_id)
        WHERE id = layer.id AND tenant_id = p_tenant_id;
      INSERT INTO public.inventory_cost_events
        (tenant_id, event_type, item_id, stock_entry_id, quantity, unit_cost,
         total_cost, reference_type, reference_number, metadata)
        VALUES (p_tenant_id, 'LANDED_COST', allocation.item_id, layer.id,
          layer.quantity, round(share_amount / layer.quantity, 8), share_amount,
          'IMPORT_FILE', file_row.import_number,
          jsonb_build_object('grn_item_id', allocation.grn_item_id, 'import_file_id', p_import_file_id));
    END LOOP;
    INSERT INTO public.import_file_grn_allocations
      (tenant_id, import_file_id, import_file_grn_id, grn_id, grn_item_id,
       item_id, item_code, item_name, received_qty, base_rate, base_value,
       allocated_landed_cost, landed_unit_cost, allocation_basis, created_by)
      VALUES (p_tenant_id, p_import_file_id, allocation.import_file_grn_id,
        allocation.grn_id, allocation.grn_item_id, allocation.item_id,
        allocation.item_code, allocation.item_name, allocation.received_qty,
        allocation.base_rate, allocation.base_value, allocation.allocated_landed_cost,
        round(allocation.allocated_landed_cost / allocation.received_qty, 4),
        allocation.allocation_basis, p_user_id);
    total_allocated := total_allocated + allocation.allocated_landed_cost;
  END LOOP;
  IF abs(total_allocated - p_pool) > 0.009 THEN
    RAISE EXCEPTION 'Landed-cost allocations do not reconcile to the pool';
  END IF;
  UPDATE public.import_file_grns SET status = 'POSTED'
    WHERE tenant_id = p_tenant_id AND import_file_id = p_import_file_id;
  UPDATE public.import_files
    SET status = 'LANDED_COST_POSTED', final_landed_cost = p_pool, updated_at = now()
    WHERE tenant_id = p_tenant_id AND id = p_import_file_id;
  RETURN jsonb_build_object('lines', row_count, 'landed_cost', total_allocated);
END $$;
