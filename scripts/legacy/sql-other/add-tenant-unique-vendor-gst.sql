-- Prevent duplicate vendor GST numbers within the same tenant.
-- Blank GST values remain allowed.

create unique index if not exists vendors_tenant_tax_id_unique_idx
on public.vendors (tenant_id, upper(btrim(tax_id)))
where tax_id is not null and btrim(tax_id) <> '';