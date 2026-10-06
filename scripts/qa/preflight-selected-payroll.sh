#!/usr/bin/env bash
set -Eeuo pipefail

app_root="$(readlink -f "$1")"
env_file="$app_root/apps/api/.env"
test -f "$env_file"
database_url="$(tr -d '\r' < "$env_file" | sed -n 's/^DIRECT_URL=//p' | head -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "$database_url" ]]; then
  database_url="$(tr -d '\r' < "$env_file" | sed -n 's/^DATABASE_URL=//p' | head -n 1 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
fi
test -n "$database_url"
database_host="${database_url#*://}"
database_host="${database_host#*@}"
database_host="${database_host%%[:/]*}"
printf 'database_host=%s\n' "$database_host"

psql "$database_url" -X -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT 'control_table=' || (to_regclass('public.hr_payroll_month_controls') IS NOT NULL)::text;
SELECT 'feature_flags_table=' || (to_regclass('public.hr_payroll_feature_flags') IS NOT NULL)::text;
SELECT 'selected_scope_function=' || (to_regprocedure('public.hr_payroll_scope_check_again(uuid,character varying,uuid,jsonb,jsonb,integer,integer,text,jsonb)') IS NOT NULL)::text;
SELECT 'transition_function=' || (to_regprocedure('public.hr_payroll_control_transition(uuid,uuid,text,text,uuid,text,text,jsonb,text,boolean,boolean)') IS NOT NULL)::text;
SELECT 'tenant_count=' || count(*) FROM public.tenants;
SELECT 'active_employee_count=' || count(*) FROM public.employees WHERE upper(COALESCE(status::text,'ACTIVE')) IN ('ACTIVE','ON_LEAVE');
SELECT 'maker_checker_enabled=' || count(*) FROM public.hr_payroll_maker_checker_config WHERE enabled;
SELECT 'approved_or_paid_controls=' || count(*) FROM public.hr_payroll_month_controls WHERE stage IN ('APPROVED','PAID');
SELECT 'september_controls=' || count(*) FROM public.hr_payroll_month_controls WHERE payroll_month='2026-09';
SELECT 'transition_flags_on=' || count(*) FROM public.hr_payroll_feature_flags WHERE feature_key='PAYROLL_STATE_TRANSITIONS_ENABLED' AND is_enabled;
SELECT 'cockpit_flags_on=' || count(*) FROM public.hr_payroll_feature_flags WHERE feature_key='PAYROLL_MONTH_COCKPIT_ENABLED' AND is_enabled;
SELECT 'duplicate_run_employee_pairs=' || count(*) FROM (
  SELECT payroll_run_id,employee_id FROM public.payslips GROUP BY payroll_run_id,employee_id HAVING count(*)>1
) duplicates;
SELECT 'payroll_flag_tenant=' || tenant_id::text || ':' || feature_key || ':' || is_enabled::text
  FROM public.hr_payroll_feature_flags
  WHERE feature_key IN ('PAYROLL_STATE_TRANSITIONS_ENABLED','PAYROLL_MONTH_COCKPIT_ENABLED') AND is_enabled
  ORDER BY tenant_id,feature_key;
SELECT 'candidate_tenant=' || id::text || ':' || name
  FROM public.tenants WHERE lower(name) LIKE '%saif%' OR lower(name) LIKE '%mizantra%' OR lower(name) LIKE '%arwa%'
  ORDER BY name LIMIT 20;
SQL
