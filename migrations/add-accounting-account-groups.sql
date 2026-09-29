-- Account groups provide a controlled multi-level chart of accounts.
-- Groups are reporting nodes only and cannot be selected for journal posting.
ALTER TABLE public.accounting_accounts
  ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_accounting_accounts_tenant_parent
  ON public.accounting_accounts (tenant_id, parent_id);
