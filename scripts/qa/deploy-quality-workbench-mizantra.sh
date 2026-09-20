#!/usr/bin/env bash
set -Eeuo pipefail
app=/var/www/sak-erp-test; stage=/tmp/mizantra-quality-workbench-20260906-v2; release=quality-workbench-20260906; page=apps/web/src/app/dashboard/quality/page.tsx; backup="$app/backups/$release-$(date +%Y%m%d-%H%M%S)"
[[ "$PWD" == "$app" && "$(readlink -f "$app")" == "$app" && -f "$stage/$page" ]]; mkdir -p "$backup/source/$(dirname "$page")"; cp -a "$page" "$backup/source/$page"; tar -czf "$backup/web-next.tgz" -C apps/web .next
rollback(){ code=$?; trap - ERR; pm2 stop sak-web-test || true; cp -a "$backup/source/$page" "$page"; rm -rf -- apps/web/.next; tar -xzf "$backup/web-next.tgz" -C apps/web; pm2 restart sak-web-test --update-env || true; exit "$code"; }; trap rollback ERR
cp -a "$stage/$page" "$page"; pnpm --filter @sak-erp/web build; pm2 restart sak-web-test --update-env; pm2 save
for _ in $(seq 1 40); do status=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/quality || true); [[ "$status" == 200 ]] && break; sleep 2; done; [[ "$status" == 200 ]]; pm2 describe sak-web-test | grep -q online; trap - ERR; rm -rf -- "$stage"; printf '{"result":"deployed","backup":"%s","http":%s}\n' "$backup" "$status"
