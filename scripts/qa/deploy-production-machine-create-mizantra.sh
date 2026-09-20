#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-production-machine-create-20260908-v1
release=production-machine-create-20260908-v1
file=apps/web/src/app/dashboard/settings/production-setup/page.tsx
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$file" ]]
pm2 describe sak-web-test | grep -q online

mkdir -p "$backup/source/$(dirname "$file")"
cp -a "$file" "$backup/source/$file"
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring the previous Mizantra production setup." >&2
  pm2 stop sak-web-test >/dev/null 2>&1 || true
  cp -a "$backup/source/$file" "$file"
  [[ "$(readlink -f apps/web/.next)" == "$app/apps/web/.next" ]]
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

cp -a "$stage/$file" "$file"
grep -q 'Create new machine' "$file"
grep -q '/production/work-stations' "$file"
pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save

status=000
for _ in $(seq 1 40); do
  status="$(curl -sS -o /dev/null -w '%{http_code}' \
    http://127.0.0.1:3001/dashboard/settings/production-setup || true)"
  [[ "$status" == 200 ]] && break
  sleep 2
done

[[ "$status" == 200 ]]
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","target":"mizantra-only","service":"sak-web-test","http":%s,"backup":"%s"}\n' "$status" "$backup"
