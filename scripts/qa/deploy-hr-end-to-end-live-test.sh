#!/usr/bin/env bash
set -Eeuo pipefail

echo "DEPLOYMENT BLOCKED: this retired script predates separate live/test databases. Use a target-specific guarded deployment." >&2
exit 2

stage=/tmp/hr-end-to-end-20260912
stamp="$(date +%Y%m%d-%H%M%S)"
live=/var/www/sak-erp
test=/var/www/sak-erp-test
db_backup="/home/qutubk/sak-deploy-backups/hr-before-${stamp}.tgz"

files=(
  apps/api/src/hr/controllers/hr.controller.ts
  apps/api/src/hr/hr.module.ts
  apps/api/src/hr/services/hr.service.ts
  apps/api/src/hr/services/hr-attendance-control.service.ts
  apps/web/src/app/dashboard/hr/page.tsx
)

sources_staged=0
rollback() {
  code=$?
  if (( code != 0 && sources_staged == 1 )); then
    echo "HR deployment failed; restoring the prior live and test sources." >&2
    for app in "$live" "$test"; do
      backup="$app/backups/hr-end-to-end-${stamp}"
      for file in "${files[@]}"; do
        if [[ -f "$backup/$file" ]]; then
          cp -a "$backup/$file" "$app/$file"
        else
          rm -f -- "$app/$file"
        fi
      done
      (cd "$app" && pnpm --filter @sak-erp/api build && pnpm --filter @sak-erp/web build) >/dev/null 2>&1 || true
    done
    pm2 restart sak-api sak-web sak-api-test sak-web-test --update-env >/dev/null 2>&1 || true
  fi
  exit "$code"
}
trap rollback EXIT

[[ "$(readlink -f "$live")" == "$live" ]]
[[ "$(readlink -f "$test")" == "$test" ]]
[[ -f "$stage/migrations/add-hr-attendance-approval-and-payroll-controls.sql" ]]
for file in "${files[@]}"; do [[ -f "$stage/$file" ]]; done

mkdir -p /home/qutubk/sak-deploy-backups

database_url="$(node - "$live/apps/api/.env" <<'NODE'
const fs = require('fs');
const p = process.argv[2];
const line = fs.readFileSync(p, 'utf8').split(/\r?\n/).find((v) => /^DATABASE_URL=/.test(v));
if (!line) process.exit(2);
let value = line.slice(line.indexOf('=') + 1).trim();
if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
process.stdout.write(value);
NODE
)"
[[ -n "$database_url" ]]

# The two deployments are intentionally checked before applying the shared DB migration.
test_database_url="$(node - "$test/apps/api/.env" <<'NODE'
const fs = require('fs');
const p = process.argv[2];
const line = fs.readFileSync(p, 'utf8').split(/\r?\n/).find((v) => /^DATABASE_URL=/.test(v));
if (!line) process.exit(2);
let value = line.slice(line.indexOf('=') + 1).trim();
if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
process.stdout.write(value);
NODE
)"
[[ "$database_url" == "$test_database_url" ]]

# Version-independent HR data backup. Supabase currently runs PostgreSQL 17
# while this VPS has pg_dump 16, so psql JSON snapshots avoid a version-mismatch
# failure and retain every value needed to restore the affected rows.
backup_dir="$(mktemp -d /tmp/hr-db-backup-XXXXXX)"
for table in employees attendance attendance_punches attendance_records leave_requests salary_components payroll_runs payslips; do
  psql "$database_url" -v ON_ERROR_STOP=1 -At \
    -c "SELECT COALESCE(json_agg(t), '[]'::json) FROM public.${table} t" \
    > "$backup_dir/${table}.json"
done
psql "$database_url" -v ON_ERROR_STOP=1 -At \
  -c "SELECT json_build_object('captured_at', now(), 'database', current_database(), 'server_version', current_setting('server_version'))" \
  > "$backup_dir/manifest.json"
tar -czf "$db_backup" -C "$backup_dir" .
rm -rf -- "$backup_dir"
[[ -s "$db_backup" ]]

for app in "$live" "$test"; do
  backup="$app/backups/hr-end-to-end-${stamp}"
  mkdir -p "$backup"
  for file in "${files[@]}"; do
    mkdir -p "$backup/$(dirname "$file")" "$app/$(dirname "$file")"
    if [[ -f "$app/$file" ]]; then cp -a "$app/$file" "$backup/$file"; fi
    cp -a "$stage/$file" "$app/$file"
  done
done
sources_staged=1

# Apply once because live and test currently point at the same Supabase project.
psql "$database_url" -v ON_ERROR_STOP=1 -f "$stage/migrations/add-hr-attendance-approval-and-payroll-controls.sql" >/dev/null

cd "$live"
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build

cd "$test"
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build

pm2 restart sak-api sak-web sak-api-test sak-web-test --update-env >/dev/null

for attempt in $(seq 1 45); do
  live_api="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/hr/attendance/policy || true)"
  live_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/dashboard/hr || true)"
  test_api="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/hr/attendance/policy || true)"
  test_web="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/hr || true)"
  if [[ "$live_api" == 401 && "$test_api" == 401 && "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ ]]; then
    break
  fi
  sleep 2
done

[[ "$live_api" == 401 && "$test_api" == 401 ]]
[[ "$live_web" =~ ^(200|307|308)$ && "$test_web" =~ ^(200|307|308)$ ]]
for process in sak-api sak-web sak-api-test sak-web-test; do
  pm2 describe "$process" | grep -q online
done

# Schema assertions plus preservation counts are printed without exposing HR data.
psql "$database_url" -At -v ON_ERROR_STOP=1 <<'SQL'
SELECT json_build_object(
  'employees', (SELECT count(*) FROM public.employees),
  'attendance', (SELECT count(*) FROM public.attendance),
  'punches', (SELECT count(*) FROM public.attendance_punches),
  'legacy_attendance', (SELECT count(*) FROM public.attendance_records),
  'leave_requests', (SELECT count(*) FROM public.leave_requests),
  'payslips', (SELECT count(*) FROM public.payslips),
  'approval_table', to_regclass('public.attendance_approvals') IS NOT NULL,
  'policy_table', to_regclass('public.hr_attendance_policies') IS NOT NULL
);
SQL

printf '{"deployed":true,"live_api":%s,"live_web":%s,"test_api":%s,"test_web":%s,"backup":"%s"}\n' \
  "$live_api" "$live_web" "$test_api" "$test_web" "$db_backup"
trap - EXIT
