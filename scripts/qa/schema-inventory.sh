#!/usr/bin/env bash
set -euo pipefail

app_path="${1:?Usage: schema-inventory.sh APP_PATH}"
mode="${2:-columns}"
env_file="$app_path/apps/api/.env"

database_url="$(tr -d '\r' < "$env_file" | sed -n 's/^DATABASE_URL=//p' | head -1)"
test -n "$database_url"

if [[ "$mode" == "tables" ]]; then
  psql "$database_url" -At <<'SQL'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
SQL
  exit 0
fi

if [[ "$mode" == "feature-summary" ]]; then
  psql "$database_url" -At <<'SQL'
SELECT t.name || '|' || COUNT(c.feature_key) || '|' ||
       COUNT(c.feature_key) FILTER (WHERE COALESCE(e.is_enabled, TRUE)) || '|' ||
       COUNT(c.feature_key) FILTER (WHERE NOT COALESCE(e.is_enabled, TRUE))
FROM public.tenants t
CROSS JOIN public.app_feature_catalogue c
LEFT JOIN public.tenant_feature_entitlements e
  ON e.tenant_id = t.id AND e.feature_key = c.feature_key
WHERE t.is_active = TRUE AND c.is_active = TRUE
GROUP BY t.id, t.name
ORDER BY t.name;
SQL
  exit 0
fi

if [[ "$mode" == "catalogue" ]]; then
  psql "$database_url" -At <<'SQL'
SELECT feature_key || '|' || module_name || '|' || COALESCE(screen_route, '') || '|' || route_match
FROM public.app_feature_catalogue
WHERE is_active = TRUE
ORDER BY feature_key;
SQL
  exit 0
fi

if [[ "$mode" == "feature-detail" ]]; then
  psql "$database_url" -At <<'SQL'
SELECT t.name || '|' || c.feature_key || '|' || c.module_name || '|' ||
       COALESCE(c.screen_route, '') || '|' || COALESCE(e.is_enabled, TRUE)
FROM public.tenants t
CROSS JOIN public.app_feature_catalogue c
LEFT JOIN public.tenant_feature_entitlements e
  ON e.tenant_id = t.id AND e.feature_key = c.feature_key
WHERE t.is_active = TRUE AND c.is_active = TRUE
ORDER BY t.name, c.module_name, c.display_order, c.feature_key;
SQL
  exit 0
fi

if [[ "$mode" == "enabled-routes" ]]; then
  tenant_name="${3:?tenant name required for enabled-routes}"
  psql "$database_url" -v tenant_name="$tenant_name" -At <<'SQL'
SELECT DISTINCT c.screen_route
FROM public.tenants t
CROSS JOIN public.app_feature_catalogue c
LEFT JOIN public.tenant_feature_entitlements e
  ON e.tenant_id = t.id AND e.feature_key = c.feature_key
WHERE t.name = :'tenant_name'
  AND t.is_active = TRUE
  AND c.is_active = TRUE
  AND c.screen_route IS NOT NULL
  AND COALESCE(e.is_enabled, TRUE) = TRUE
ORDER BY c.screen_route;
SQL
  exit 0
fi

if [[ "$mode" == "saif-enabled-routes" ]]; then
  psql "$database_url" -At <<'SQL'
SELECT DISTINCT c.screen_route
FROM public.tenants t
CROSS JOIN public.app_feature_catalogue c
LEFT JOIN public.tenant_feature_entitlements e
  ON e.tenant_id = t.id AND e.feature_key = c.feature_key
WHERE LOWER(t.name) = LOWER('Saif Automations Services LLP')
  AND t.is_active = TRUE
  AND c.is_active = TRUE
  AND c.screen_route IS NOT NULL
  AND COALESCE(e.is_enabled, TRUE) = TRUE
ORDER BY c.screen_route;
SQL
  exit 0
fi

if [[ "$mode" == "dump-schema" ]]; then
  pg_dump "$database_url" --schema-only --no-owner --no-acl
  exit 0
fi

psql "$database_url" -At <<'SQL'
SELECT table_name || '|' || column_name || '|' || data_type || '|' || udt_name || '|' || is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
SQL
