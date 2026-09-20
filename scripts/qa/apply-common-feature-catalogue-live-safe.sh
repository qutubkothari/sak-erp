#!/usr/bin/env bash
set -Eeuo pipefail

app_root="$(readlink -f "${1:?app root required}")"
sql_file="$(readlink -f "${2:?sql file required}")"
backup_root="$(readlink -f "${3:?verified backup root required}")"

test "$app_root" = /var/www/sak-erp
test -f "$sql_file"
test -f "$backup_root/live-database.dump"
test -f "$backup_root/SHA256SUMS"
(cd "$backup_root" && sha256sum -c SHA256SUMS >/dev/null)

database_url="$(tr -d '\r' < "$app_root/apps/api/.env" | sed -n 's/^DATABASE_URL=//p' | head -1)"
test -n "$database_url"

psql "$database_url" -v ON_ERROR_STOP=1 -Atc \
  "SELECT t.id, t.name, c.feature_key, COALESCE(e.is_enabled, TRUE) FROM public.tenants t CROSS JOIN public.app_feature_catalogue c LEFT JOIN public.tenant_feature_entitlements e ON e.tenant_id=t.id AND e.feature_key=c.feature_key ORDER BY t.id,c.feature_key" \
  > "$backup_root/live-feature-entitlements-before-common-release.tsv"

psql "$database_url" -v ON_ERROR_STOP=1 -f "$sql_file"

catalogue_count="$(psql "$database_url" -Atc "SELECT COUNT(*) FROM public.app_feature_catalogue WHERE is_active=TRUE")"
new_enabled="$(psql "$database_url" -Atc "SELECT COUNT(*) FROM public.tenant_feature_entitlements WHERE feature_key IN ('business-transformation','production-shop-floor','production-work-stations','quality-inspection-plans') AND is_enabled=TRUE")"
new_disabled="$(psql "$database_url" -Atc "SELECT COUNT(*) FROM public.tenant_feature_entitlements WHERE feature_key IN ('business-transformation','production-shop-floor','production-work-stations','quality-inspection-plans') AND is_enabled=FALSE")"

test "$catalogue_count" -eq 95
test "$new_enabled" -eq 0
test "$new_disabled" -ge 4

echo "FEATURE_CATALOGUE_SYNCED catalogue=$catalogue_count new_enabled=$new_enabled new_disabled=$new_disabled"
