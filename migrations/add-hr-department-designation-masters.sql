-- Additive HR organization masters with deterministic, tenant-local backfill.
-- Existing labels are preserved verbatim (after trimming) and case-folded only
-- for duplicate detection. No employee identity or access data is rewritten.

create table if not exists public.hr_departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code varchar(40),
  name varchar(200) not null,
  status varchar(12) not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_departments_tenant_id_id_key unique (tenant_id, id)
);

create unique index if not exists hr_departments_tenant_name_ci_key
  on public.hr_departments (tenant_id, lower(btrim(name)));
create unique index if not exists hr_departments_tenant_code_ci_key
  on public.hr_departments (tenant_id, lower(btrim(code))) where code is not null and btrim(code) <> '';
create index if not exists hr_departments_tenant_status_name_idx
  on public.hr_departments (tenant_id, status, name);

create table if not exists public.hr_designations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code varchar(40),
  name varchar(200) not null,
  status varchar(12) not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_designations_tenant_id_id_key unique (tenant_id, id)
);

create unique index if not exists hr_designations_tenant_name_ci_key
  on public.hr_designations (tenant_id, lower(btrim(name)));
create unique index if not exists hr_designations_tenant_code_ci_key
  on public.hr_designations (tenant_id, lower(btrim(code))) where code is not null and btrim(code) <> '';
create index if not exists hr_designations_tenant_status_name_idx
  on public.hr_designations (tenant_id, status, name);

alter table public.employees add column if not exists department_id uuid;
alter table public.employees add column if not exists designation_id uuid;
create index if not exists employees_tenant_department_id_idx on public.employees (tenant_id, department_id);
create index if not exists employees_tenant_designation_id_idx on public.employees (tenant_id, designation_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'employees_tenant_department_fk') then
    alter table public.employees add constraint employees_tenant_department_fk
      foreign key (tenant_id, department_id) references public.hr_departments (tenant_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'employees_tenant_designation_fk') then
    alter table public.employees add constraint employees_tenant_designation_fk
      foreign key (tenant_id, designation_id) references public.hr_designations (tenant_id, id) on delete restrict;
  end if;
end $$;

insert into public.hr_departments (tenant_id, name)
select tenant_id, min(btrim(department))
from public.employees
where tenant_id is not null and nullif(btrim(department), '') is not null
group by tenant_id, lower(btrim(department))
on conflict do nothing;

update public.employees e
set department_id = d.id
from public.hr_departments d
where e.department_id is null
  and e.tenant_id = d.tenant_id
  and nullif(btrim(e.department), '') is not null
  and lower(btrim(e.department)) = lower(btrim(d.name));

insert into public.hr_designations (tenant_id, name)
select tenant_id, min(btrim(designation))
from public.employees
where tenant_id is not null and nullif(btrim(designation), '') is not null
group by tenant_id, lower(btrim(designation))
on conflict do nothing;

update public.employees e
set designation_id = d.id
from public.hr_designations d
where e.designation_id is null
  and e.tenant_id = d.tenant_id
  and nullif(btrim(e.designation), '') is not null
  and lower(btrim(e.designation)) = lower(btrim(d.name));

comment on table public.hr_departments is 'Tenant-scoped HR department master; employee.department remains temporarily readable for compatibility.';
comment on table public.hr_designations is 'Tenant-scoped HR designation master; employee.designation remains temporarily readable for compatibility.';
