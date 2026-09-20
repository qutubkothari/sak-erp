#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-sak-branding-release
release=mizantra-sak-branding-20260906
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/apps/web/src/app/login/page.tsx" ]]
[[ -f "$stage/apps/web/public/branding/sak-solutions-mark.png" ]]

files=(
  apps/web/src/app/layout.tsx
  apps/web/src/app/login/page.tsx
  apps/web/src/components/Sidebar.tsx
  apps/web/src/lib/document-branding.ts
  apps/web/src/lib/rbac.ts
  apps/web/src/app/dashboard/hr/page.tsx
  apps/web/src/app/dashboard/sales/page.tsx
  apps/web/public/manifest.webmanifest
  apps/web/public/offline.html
  apps/web/public/favicon.svg
  apps/web/public/pwa-icon.svg
  apps/web/public/pwa-icon-192.png
  apps/web/public/pwa-icon-512.png
  apps/web/public/branding/sak-solutions-mark.png
  apps/web/public/branding/sak-solutions-logo.png
  apps/web/public/branding/po-logo-script.jpg
  apps/web/public/branding/po-logo-mark.jpg
  apps/api/src/common/services/document-branding.service.ts
  apps/api/src/purchase/services/world-class-po-pdf.service.ts
  apps/api/src/purchase/services/backup-po-format-2026-03-31/world-class-po-pdf.service.ts
  apps/api/src/purchase/services/backup-po-format-2026-03-31/world-class-po-pdf-pre-rewrite.service.ts
  apps/api/src/subcontracting/subcontracting.service.ts
  apps/api/src/auth/auth.service.spec.ts
  apps/api/src/email/email.service.ts
  apps/api/assets/sak-solutions-mark.png
  apps/api/assets/sak-solutions-logo.png
  apps/api/assets/po-logo-script.jpg
  apps/api/assets/po-logo-mark.jpg
  packages/database/prisma/schema.prisma
  packages/database/src/seed.ts
  packages/hr-module/package.json
  packages/hr-module/README.md
  migrations/rebrand-mizantra-to-sak-solutions.sql
  scripts/qa/apply-mizantra-branding.cjs
  scripts/qa/audit-mizantra-branding.cjs
)

mkdir -p "$backup/source"
for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    mkdir -p "$backup/source/$(dirname "$file")"
    cp -a "$file" "$backup/source/$file"
  fi
done
[[ ! -d apps/api/dist ]] || tar -czf "$backup/api-dist.tgz" -C apps/api dist
[[ ! -d apps/web/.next ]] || tar -czf "$backup/web-next.tgz" -C apps/web .next
node scripts/qa/audit-mizantra-branding.cjs apps/api/.env > "$backup/tenant-branding-before.json" || true

rollback() {
  result=$?
  trap - ERR
  for file in "${files[@]}"; do
    if [[ -f "$backup/source/$file" ]]; then cp -a "$backup/source/$file" "$file"; fi
  done
  if [[ -f "$backup/api-dist.tgz" ]]; then rm -rf -- apps/api/dist; tar -xzf "$backup/api-dist.tgz" -C apps/api; fi
  if [[ -f "$backup/web-next.tgz" ]]; then rm -rf -- apps/web/.next; tar -xzf "$backup/web-next.tgz" -C apps/web; fi
  pm2 restart sak-api-test sak-web-test --update-env || true
  exit "$result"
}
trap rollback ERR

for file in "${files[@]}"; do
  mkdir -p "$(dirname "$file")"
  cp -a "$stage/$file" "$file"
done

pnpm --filter @sak-erp/api build
pnpm --filter @sak-erp/web build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

web_status=000
for _ in $(seq 1 45); do
  web_status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/login || true)
  [[ "$web_status" == 200 ]] && break
  sleep 2
done
[[ "$web_status" == 200 ]]

node scripts/qa/apply-mizantra-branding.cjs apps/api/.env migrations/rebrand-mizantra-to-sak-solutions.sql
node scripts/qa/audit-mizantra-branding.cjs apps/api/.env > "$backup/tenant-branding-after.json"
grep -q '"tenants":\[\]' "$backup/tenant-branding-after.json"

login_html=$(curl -sS http://127.0.0.1:3001/login)
grep -q 'Mizantra ERP' <<<"$login_html"
grep -q 'SAK Solutions' <<<"$login_html"
if grep -Eqi 'saif[[:space:]_-]*(automations?|seas)|saif erp' <<<"$login_html"; then exit 1; fi
[[ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/branding/sak-solutions-mark.png)" == 200 ]]
pm2 describe sak-web-test | grep -q online
pm2 describe sak-api-test | grep -q online

build_id=$(cat apps/web/.next/BUILD_ID)
trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","backup":"%s","web":%s,"buildId":"%s"}\n' "$backup" "$web_status" "$build_id"
