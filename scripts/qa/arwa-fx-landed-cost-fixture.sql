-- Run only in a separately created disposable PostgreSQL database.
-- Minimal operational schema for testing the ARWA landed-cost transaction.
CREATE TABLE public.purchase_orders (id uuid PRIMARY KEY);
CREATE TABLE public.purchase_order_items (id uuid PRIMARY KEY);
CREATE TABLE public.grns (id uuid PRIMARY KEY);
CREATE TABLE public.grn_payment_entries (id uuid PRIMARY KEY);
CREATE TABLE public.tenants (id uuid PRIMARY KEY, market_profile text, default_currency text);
CREATE TABLE public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid, account_code text,
  account_name text, account_type text, account_subtype text, parent_id uuid,
  currency_code text, is_group boolean, is_active boolean
);
CREATE TABLE public.accounting_posting_rules (
  tenant_id uuid, rule_code text, rule_name text, source_type text,
  debit_account_id uuid, credit_account_id uuid, narration_template text,
  is_active boolean
);
CREATE TABLE public.grn_items (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, grn_id uuid NOT NULL,
  item_id uuid NOT NULL, accepted_qty numeric NOT NULL
);
CREATE TABLE public.stock_entries (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, item_id uuid NOT NULL,
  quantity numeric(12,2) NOT NULL, available_quantity numeric(12,2) NOT NULL,
  unit_price numeric(15,2) NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE public.inventory_cost_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
  event_type varchar(60) NOT NULL, item_id uuid, stock_entry_id uuid,
  quantity numeric(18,4), unit_cost numeric(18,4), total_cost numeric(18,4),
  reference_type varchar(60), reference_number varchar(80), metadata jsonb
);
CREATE TABLE public.import_files (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, import_number varchar(60) NOT NULL,
  status varchar(40) NOT NULL, currency varchar(10) NOT NULL,
  final_landed_cost numeric(15,2) NOT NULL DEFAULT 0, updated_at timestamptz
);
CREATE TABLE public.import_file_grns (
  id uuid PRIMARY KEY, tenant_id uuid NOT NULL, import_file_id uuid NOT NULL,
  grn_id uuid NOT NULL, status varchar(30) NOT NULL
);
CREATE TABLE public.import_file_grn_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
  import_file_id uuid NOT NULL, import_file_grn_id uuid NOT NULL,
  grn_id uuid NOT NULL, grn_item_id uuid NOT NULL, item_id uuid,
  item_code text, item_name text, received_qty numeric(15,3),
  base_rate numeric(15,2), base_value numeric(15,2),
  allocated_landed_cost numeric(15,2), landed_unit_cost numeric(15,4),
  allocation_basis varchar(30), created_by uuid
);
