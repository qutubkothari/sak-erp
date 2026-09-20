#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-msme-production-cockpit-20260906-v1
release=msme-production-cockpit-20260906
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -d "$stage/apps/web/src" ]]

paths=(
  apps/web/src/app/dashboard/production/page.tsx
  apps/web/src/app/dashboard/production/smart-planning/page.tsx
  apps/web/src/app/dashboard/layout.tsx
  apps/web/src/components/Sidebar.tsx
  apps/web/src/lib/rbac.ts
)

mkdir -p "$backup/source"
for path in "${paths[@]}"; do
  [[ -f "$path" ]]
  mkdir -p "$backup/source/$(dirname "$path")"
  cp -a "$path" "$backup/source/$path"
done
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring Mizantra web application." >&2
  pm2 stop sak-web-test >/dev/null 2>&1 || true
  for path in "${paths[@]}"; do
    cp -a "$backup/source/$path" "$path"
  done
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for path in "${paths[@]}"; do
  [[ -f "$stage/$path" ]]
  mkdir -p "$(dirname "$path")"
  cp -a "$stage/$path" "$path"
done

pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save

production_ok=0
planning_ok=0
shop_floor_ok=0
for _ in $(seq 1 40); do
  production_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production || true)"
  planning_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/production/smart-planning || true)"
  shop_floor_status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/shop-floor || true)"
  [[ "$production_status" == 200 ]] && production_ok=1
  [[ "$planning_status" == 200 ]] && planning_ok=1
  [[ "$shop_floor_status" == 200 ]] && shop_floor_ok=1
  if (( production_ok && planning_ok && shop_floor_ok )); then break; fi
  sleep 2
done
(( production_ok && planning_ok && shop_floor_ok ))
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","production":%s,"planning":%s,"shopFloor":%s,"backup":"%s"}\n' \
  "$production_status" "$planning_status" "$shop_floor_status" "$backup"
