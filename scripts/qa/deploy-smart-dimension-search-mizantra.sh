#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/sak-erp-test"
RELEASE_DIR="/tmp/mizantra-smart-search-release"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$APP_DIR/backups/smart-search-$STAMP"

FILES=(
  "apps/api/src/items/services/items.service.ts"
  "apps/web/src/lib/smart-search.ts"
  "apps/web/src/components/SearchableSelect.tsx"
  "apps/web/src/components/ui/ListTable.tsx"
  "apps/web/src/app/dashboard/bom/page.tsx"
  "apps/web/src/app/dashboard/production/job-orders/page.tsx"
  "apps/web/src/app/dashboard/inventory/items/page.tsx"
  "apps/web/src/app/dashboard/inventory/low-stock/page.tsx"
  "apps/web/src/app/dashboard/purchase/grn/page.tsx"
  "apps/web/src/app/dashboard/production/subcontracting/page.tsx"
)

rollback() {
  status=$?
  if [[ $status -eq 0 ]]; then return; fi
  echo "Deployment failed; restoring $BACKUP_DIR"
  for file in "${FILES[@]}"; do
    if [[ -f "$BACKUP_DIR/$file" ]]; then
      cp "$BACKUP_DIR/$file" "$APP_DIR/$file"
    elif [[ -f "$BACKUP_DIR/$file.missing" ]]; then
      rm -f "$APP_DIR/$file"
    fi
  done
  if [[ -d "$BACKUP_DIR/api-dist" ]]; then
    rm -rf "$APP_DIR/apps/api/dist"
    cp -a "$BACKUP_DIR/api-dist" "$APP_DIR/apps/api/dist"
  fi
  if [[ -d "$BACKUP_DIR/web-next" ]]; then
    rm -rf "$APP_DIR/apps/web/.next"
    cp -a "$BACKUP_DIR/web-next" "$APP_DIR/apps/web/.next"
  fi
  pm2 restart sak-api-test sak-web-test --update-env || true
  exit "$status"
}
trap rollback ERR

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  if [[ -f "$file" ]]; then
    cp "$file" "$BACKUP_DIR/$file"
  else
    touch "$BACKUP_DIR/$file.missing"
  fi
done
cp -a apps/api/dist "$BACKUP_DIR/api-dist"
cp -a apps/web/.next "$BACKUP_DIR/web-next"

for file in "${FILES[@]}"; do
  mkdir -p "$APP_DIR/$(dirname "$file")"
  cp "$RELEASE_DIR/$file" "$APP_DIR/$file"
done

npm --prefix apps/api run build
npm --prefix apps/web run build
pm2 restart sak-api-test sak-web-test --update-env
pm2 save

for attempt in {1..20}; do
  status="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/login || true)"
  [[ "$status" == "200" ]] && break
  sleep 2
done
[[ "$status" == "200" ]]

build_id="$(curl -sS http://127.0.0.1:3001/build-id)"
printf '{"result":"deployed","backup":"%s","login":%s,"build":%s}\n' "$BACKUP_DIR" "$status" "$build_id"
