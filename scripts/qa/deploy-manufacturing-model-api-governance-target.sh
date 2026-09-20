#!/usr/bin/env bash
set -Eeuo pipefail
if [ "$#" -ne 3 ]; then echo "usage: $0 <app-root> <api-process> <api-port>" >&2; exit 64; fi
app_root="$(readlink -f "$1")"; process="$2"; port="$3"
case "$app_root" in /var/www/sak-erp|/var/www/sak-erp-test) ;; *) exit 65;; esac
release="20260905-mfg-model-api-governance"
archive="/tmp/$release.tar.gz"; stage="/tmp/$release-stage"
case "$stage" in /tmp/20260905-mfg-model-api-governance-stage) ;; *) exit 66;; esac
echo "18e7ab4ba88a4ecc9672b582b383aa99caed224fef10c642a34c6b32c3a1243b  $archive" | sha256sum -c -
rm -rf -- "$stage"; mkdir -p "$stage"; tar -xzf "$archive" -C "$stage"
test -f "$stage/apps/api/dist/main.js"; cd "$app_root"
test ! -e "apps/api/dist.pre-$release"
pm2 stop "$process"
mv apps/api/dist "apps/api/dist.pre-$release"
mv "$stage/apps/api/dist" apps/api/dist
cp "$stage/apps/api/src/mrp/advanced-production-planning.service.ts" apps/api/src/mrp/
pm2 restart "$process" --update-env; pm2 save
for _ in $(seq 1 30); do
  status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/api/v1/production-planning/masters" || true)"
  if [[ "$status" =~ ^(401|403)$ ]]; then rm -rf -- "$stage"; rm -f -- "$archive"; echo "MFG_MODEL_GOVERNANCE_DEPLOYED api=$status"; exit 0; fi
  sleep 1
done
pm2 stop "$process" || true
rm -rf -- apps/api/dist
mv "apps/api/dist.pre-$release" apps/api/dist
pm2 restart "$process" --update-env
exit 1
