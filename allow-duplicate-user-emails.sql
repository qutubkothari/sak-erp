ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_tenant_id_email_key;

CREATE INDEX IF NOT EXISTS idx_users_tenant_email
ON public.users (tenant_id, email);