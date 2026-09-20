-- Add multi-role support via a user_roles join table
-- Safe to run multiple times.

-- Needed for gen_random_uuid() in many Supabase/Postgres setups
create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, role_id)
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists user_roles_tenant_id_idx on public.user_roles(tenant_id);

-- Backfill existing single-role assignments
insert into public.user_roles (tenant_id, user_id, role_id)
select u.tenant_id, u.id, u.role_id
from public.users u
where u.role_id is not null
on conflict do nothing;
