#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-arabic-toggle-hotfix-20260910
backup="$app/backups/arabic-toggle-hotfix-20260910-$(date +%Y%m%d-%H%M%S)"
paths=(
  apps/web/src/lib/locale.tsx
  apps/web/src/lib/arabic-catalogue.generated.json
  apps/web/src/components/LanguageSwitch.tsx
  apps/web/src/components/Sidebar.tsx
  apps/web/src/components/DashboardReminders.tsx
  apps/web/src/components/SearchableSelect.tsx
  apps/web/src/app/dashboard/layout.tsx
  apps/web/src/app/dashboard/settings/production-setup/ProductionCostSheet.tsx
)

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
mkdir -p "$backup/source"
for path in "${paths[@]}"; do
  mkdir -p "$backup/source/$(dirname "$path")"
  [[ ! -f "$path" ]] || cp -a "$path" "$backup/source/$path"
  cp -a "$stage/$path" "$path"
done
tar -czf "$backup/web-next.tgz" -C apps/web .next
pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save
status=0
for _ in $(seq 1 40); do
  status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/accounts/costing || true)"
  [[ "$status" =~ ^(200|307|308)$ ]] && break
  sleep 2
done
[[ "$status" =~ ^(200|307|308)$ ]]
printf '{"deployed":true,"web":%s,"backup":"%s"}\n' "$status" "$backup"
