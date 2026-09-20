#!/usr/bin/env bash
set -Eeuo pipefail

app=/var/www/sak-erp-test
stage=/tmp/mizantra-my-machine-20260906-v1
release=my-machine-20260906
backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
page=apps/web/src/app/dashboard/shop-floor/page.tsx

[[ "$PWD" == "$app" ]]
[[ "$(readlink -f "$app")" == "$app" ]]
[[ -f "$stage/$page" ]]

mkdir -p "$backup/source/$(dirname "$page")"
cp -a "$page" "$backup/source/$page"
tar -czf "$backup/web-next.tgz" -C apps/web .next

rollback() {
  code=$?
  trap - ERR
  echo "Deployment failed; restoring Mizantra web application." >&2
  pm2 stop sak-web-test >/dev/null 2>&1 || true
  cp -a "$backup/source/$page" "$page"
  rm -rf -- apps/web/.next
  tar -xzf "$backup/web-next.tgz" -C apps/web
  pm2 restart sak-web-test --update-env >/dev/null 2>&1 || true
  exit "$code"
}
trap rollback ERR

cp -a "$stage/$page" "$page"
pnpm --filter @sak-erp/web build
pm2 restart sak-web-test --update-env
pm2 save

status=000
for _ in $(seq 1 40); do
  status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/shop-floor || true)"
  [[ "$status" == 200 ]] && break
  sleep 2
done
[[ "$status" == 200 ]]
pm2 describe sak-web-test | grep -q online

trap - ERR
rm -rf -- "$stage"
printf '{"deployed":true,"target":"mizantra-only","myMachine":%s,"backup":"%s"}\n' "$status" "$backup"
