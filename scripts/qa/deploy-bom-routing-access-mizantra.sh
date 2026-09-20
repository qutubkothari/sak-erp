#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-bom-routing-access-20260908-v5
release=bom-routing-access-20260908-v5
files=(
  apps/web/src/lib/rbac.ts
  apps/web/src/app/dashboard/bom/\[id\]/routing/page.tsx
)
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
for file in "${files[@]}"; do
  [[ -f "$stage/$file" ]]
done
pm2 describe sak-web-test | grep -q online

for file in "${files[@]}"; do
  mkdir -p "$backup/source/$(dirname "$file")"
  cp -a "$file" "$backup/source/$file"
done
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring the previous Mizantra BOM routing release." >&2
  pm2 stop sak-web-test >/dev/null 2>&1 || true
  for file in "${files[@]}"; do
    cp -a "$backup/source/$file" "$file"
  done
  [[ "$(readlink -f apps/web/.next)" == "$app/apps/web/.next" ]]
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

for file in "${files[@]}"; do
  cp -a "$stage/$file" "$file"
done
grep -q '"bom-routing": \["bom-overview"\]' apps/web/src/lib/rbac.ts
grep -q 'bomData.item?.name' apps/web/src/app/dashboard/bom/\[id\]/routing/page.tsx
[[ "$(grep -c 'step="0.01"' apps/web/src/app/dashboard/bom/\[id\]/routing/page.tsx)" -ge 3 ]]
pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save

status=000
for _ in $(seq 1 40); do
  status="$(curl -sS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:3001/dashboard/bom/test-routing-access/routing || true)"
  [[ "$status" == 200 ]] && break
  sleep 2
done

[[ "$status" == 200 ]]
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","target":"mizantra-only","service":"sak-web-test","http":%s,"backup":"%s"}\n' "$status" "$backup"
