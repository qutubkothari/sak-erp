#!/usr/bin/env bash
set -Eeuo pipefail

app="${1:-}"
web_process="${2:-}"
health_url="${3:-}"
stage_file=/tmp/subcontract-grn-register-page.tsx

case "$app|$web_process|$health_url" in
  /var/www/sak-erp\|sak-web\|https://erp.saifseas.com/login) ;;
  /var/www/sak-erp-test\|sak-web-test\|https://mizantra.saksolution.com/login) ;;
  *)
    echo "Refusing unapproved deployment target: $app|$web_process|$health_url" >&2
    exit 2
    ;;
esac

test "$(readlink -f "$app")" = "$app"
test -f "$stage_file"
test -f "$app/apps/web/package.json"

page="$app/apps/web/src/app/dashboard/production/subcontracting/page.tsx"
backup="$app/backups/subcontract-grn-register-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup"
install -m 0644 "$page" "$backup/page.tsx"
tar -czf "$backup/web-next.tgz" -C "$app/apps/web" .next

rollback() {
  local code=$?
  if (( code != 0 )); then
    echo "Deployment failed; restoring $web_process from $backup" >&2
    install -m 0644 "$backup/page.tsx" "$page"
    rm -rf -- "$app/apps/web/.next"
    tar -xzf "$backup/web-next.tgz" -C "$app/apps/web"
    pm2 restart "$web_process" --update-env >/dev/null || true
  fi
  rm -f -- "$stage_file"
  exit "$code"
}
trap rollback EXIT

install -m 0644 "$stage_file" "$page"
cd "$app/apps/web"
pnpm run build
pm2 restart "$web_process" --update-env >/dev/null

for attempt in {1..30}; do
  process_status="$(pm2 jlist | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?.pm2_env?.status||'missing')})" "$web_process")"
  http_status="$(curl -sS -o /dev/null -w '%{http_code}' "$health_url" || true)"
  built_match="$(grep -R -l --include='*.js' 'Subcontract GRNs' .next/server .next/static 2>/dev/null | head -n 1 || true)"
  if [[ "$process_status" == online && "$http_status" == 200 && -n "$built_match" ]]; then
    trap - EXIT
    rm -f -- "$stage_file"
    printf '{"deployed":true,"app":"%s","process":"%s","http":%s,"artifact":"%s","backup":"%s"}\n' \
      "$app" "$web_process" "$http_status" "$built_match" "$backup"
    exit 0
  fi
  sleep 2
done

echo "Post-deployment verification did not become healthy." >&2
false
