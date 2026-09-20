#!/usr/bin/env bash
set -Eeuo pipefail

app="${1:-}"
process_name="${2:-}"
api_port="${3:-}"
stage=/tmp/mrp-job-order-date-fix

case "$app|$process_name|$api_port" in
  /var/www/sak-erp-test\|sak-api-test\|4001) target=mizantra ;;
  /var/www/sak-erp\|sak-api\|4000) target=saifseas ;;
  *) echo "Refusing unapproved deployment target." >&2; exit 2 ;;
esac

test "$(readlink -f "$app")" = "$app"
test -f "$stage/mrp.service.ts"
test -f "$stage/mrp.service.js"
test -f "$app/apps/api/src/mrp/mrp.service.ts"
test -f "$app/apps/api/dist/mrp/mrp.service.js"

if [ "$target" = mizantra ]; then
  backup="/root/sak-deploy-backups/${target}-mrp-job-order-date-$(date +%Y%m%d-%H%M%S)"
else
  backup="$app/backups/${target}-mrp-job-order-date-$(date +%Y%m%d-%H%M%S)"
fi
mkdir -p "$backup/src" "$backup/dist"
cp -a "$app/apps/api/src/mrp/mrp.service.ts" "$backup/src/"
cp -a "$app/apps/api/dist/mrp/mrp.service.js"* "$backup/dist/"

rollback() {
  echo "MRP deployment failed; restoring $target API." >&2
  cp -a "$backup/src/mrp.service.ts" "$app/apps/api/src/mrp/"
  cp -a "$backup/dist/mrp.service.js"* "$app/apps/api/dist/mrp/"
  pm2 restart "$process_name" --update-env >/dev/null || true
}
trap rollback ERR

install -m 0644 "$stage/mrp.service.ts" "$app/apps/api/src/mrp/mrp.service.ts"
install -m 0644 "$stage/mrp.service.js" "$app/apps/api/dist/mrp/mrp.service.js"
if test -f "$stage/mrp.service.js.map"; then
  install -m 0644 "$stage/mrp.service.js.map" "$app/apps/api/dist/mrp/mrp.service.js.map"
fi

pm2 restart "$process_name" --update-env >/dev/null
for attempt in {1..25}; do
  sleep 2
  status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$process_name")"
  auth_http="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$api_port/api/v1/mrp/latest" || true)"
  if [[ "$status" == online && "$auth_http" =~ ^(401|403)$ ]]; then
    trap - ERR
    rm -rf -- "$stage"
    printf '{"deployed":true,"target":"%s","status":"%s","auth_guard_http":%s,"backup":"%s"}\n' \
      "$target" "$status" "$auth_http" "$backup"
    exit 0
  fi
done

false
