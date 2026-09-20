#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-project-edit-20260908-v1
release=project-edit-20260908-v1
page=apps/web/src/app/dashboard/projects/page.tsx
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$page" ]]
pm2 describe sak-web-test | grep -q online

mkdir -p "$backup/source/$(dirname "$page")"
cp -a "$page" "$backup/source/$page"
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring the previous Mizantra Projects release." >&2
  pm2 stop sak-web-test >/dev/null 2>&1 || true
  cp -a "$backup/source/$page" "$page"
  [[ "$(readlink -f apps/web/.next)" == "$app/apps/web/.next" ]]
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

cp -a "$stage/$page" "$page"
grep -q "openEditProject" "$page"
pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save

status=000
for _ in $(seq 1 40); do
  status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/projects || true)"
  [[ "$status" == 200 ]] && break
  sleep 2
done

[[ "$status" == 200 ]]
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"result":"deployed","target":"mizantra-only","service":"sak-web-test","http":%s,"content":true,"backup":"%s"}\n' "$status" "$backup"
