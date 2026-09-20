#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp
stage=/tmp/attendance-idempotency-20260911
backup="$app/backups/attendance-idempotency-$(date +%Y%m%d-%H%M%S)"
api_source=apps/api/src/hr/services/hr.service.ts
web_source=apps/web/src/app/dashboard/hr/page.tsx
runtime_backup=/tmp/attendance-idempotency-runtime-$$.tgz

# Saif Seas Kolkata office. The browser and API must use the same centre and
# policy; otherwise the UI can demand evidence that the server does not need.
export HR_OFFICE_LAT=22.579128
export HR_OFFICE_LNG=88.349857
export HR_OFFICE_RADIUS_METERS=100
export HR_OFFICE_ACCURACY_GRACE_METERS=50
export NEXT_PUBLIC_HR_OFFICE_LAT="$HR_OFFICE_LAT"
export NEXT_PUBLIC_HR_OFFICE_LNG="$HR_OFFICE_LNG"
export NEXT_PUBLIC_HR_OFFICE_RADIUS_METERS="$HR_OFFICE_RADIUS_METERS"
export NEXT_PUBLIC_HR_OFFICE_ACCURACY_GRACE_METERS="$HR_OFFICE_ACCURACY_GRACE_METERS"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$api_source" ]]
[[ -f "$stage/$web_source" ]]

mkdir -p "$backup/$(dirname "$api_source")" "$backup/$(dirname "$web_source")"
cp -a "$api_source" "$backup/$api_source"
cp -a "$web_source" "$backup/$web_source"
tar -czf "$runtime_backup" apps/api/dist apps/web/.next

rollback() {
  code=$?
  if (( code != 0 )); then
    cp -a "$backup/$api_source" "$api_source"
    cp -a "$backup/$web_source" "$web_source"
    rm -rf -- "$app/apps/api/dist" "$app/apps/web/.next"
    tar -xzf "$runtime_backup" -C "$app"
    pm2 restart sak-api sak-web --update-env >/dev/null 2>&1 || true
  fi
  rm -f -- "$runtime_backup"
  exit "$code"
}
trap rollback EXIT

cp -a "$stage/$api_source" "$api_source"
cp -a "$stage/$web_source" "$web_source"
pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api sak-web --update-env >/dev/null

api_status=0
web_status=0
for _ in $(seq 1 40); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/v1/auth/me || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/dashboard/hr/employees || true)"
  [[ "$api_status" == "401" && "$web_status" =~ ^(200|307|308)$ ]] && break
  sleep 2
done

[[ "$api_status" == "401" ]]
[[ "$web_status" =~ ^(200|307|308)$ ]]
grep -Fq "Check-in is intentionally idempotent" "$api_source"
grep -Fq "Reconcile with today's server record" "$web_source"
pm2 describe sak-api | grep -q online
pm2 describe sak-web | grep -q online

rm -f -- "$runtime_backup"
trap - EXIT
printf '{"deployed":true,"api":%s,"web":%s,"backup":"%s"}\n' "$api_status" "$web_status" "$backup"
