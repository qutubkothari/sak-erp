#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-production-setup-wizard-20260908-v1
release=production-setup-wizard-20260908-v1
paths=(
  apps/web/src/app/dashboard/settings/production-setup/page.tsx
  apps/web/src/components/DashboardReminders.tsx
)
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for path in "${paths[@]}"; do
  [[ -f "$stage/$path" ]]
done
pm2 describe sak-web-test | grep -q online

for path in "${paths[@]}"; do
  mkdir -p "$backup/source/$(dirname "$path")"
  cp -a "$path" "$backup/source/$path"
done
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring the previous Mizantra web release." >&2
  pm2 stop sak-web-test >/dev/null 2>&1 || true
  for path in "${paths[@]}"; do
    cp -a "$backup/source/$path" "$path"
  done
  [[ "$(readlink -f apps/web/.next)" == "$app/apps/web/.next" ]]
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for path in "${paths[@]}"; do
  cp -a "$stage/$path" "$path"
done
pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save

status=000
content_ok=0
for _ in $(seq 1 40); do
  body="$(curl -fsS http://127.0.0.1:3001/dashboard/settings/production-setup || true)"
  status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/settings/production-setup || true)"
  if [[ "$status" == 200 ]] && grep -q "Guided setup" <<<"$body"; then
    content_ok=1
    break
  fi
  sleep 2
done

[[ "$status" == 200 ]]
(( content_ok == 1 ))
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","target":"mizantra-only","service":"sak-web-test","http":%s,"content":true,"backup":"%s"}\n' "$status" "$backup"
