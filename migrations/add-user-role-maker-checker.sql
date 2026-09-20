-- Maker-checker control for user role grants and changes.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.user_role_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  requested_role_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  previous_role_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_role_change_pending
  ON public.user_role_change_requests (tenant_id, user_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_user_role_change_queue
  ON public.user_role_change_requests (tenant_id, status, requested_at DESC);

COMMENT ON TABLE public.user_role_change_requests IS
  'Maker-checker queue: requested roles are applied only after approval by another user.';
