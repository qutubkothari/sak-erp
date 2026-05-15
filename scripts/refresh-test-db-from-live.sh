#!/usr/bin/env bash
set -euo pipefail

LIVE_ENV="/var/www/sak-erp/apps/api/.env"
TEST_ENV="/var/www/sak-erp-test/apps/api/.env"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK_DIR="/tmp/sak-erp-db-refresh-${STAMP}"
LIVE_POOLER_HOST="${LIVE_POOLER_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}"
TEST_POOLER_HOST="${TEST_POOLER_HOST:-aws-1-ap-southeast-2.pooler.supabase.com}"

mkdir -p "$WORK_DIR"

get_env_value() {
  local key="$1"
  local file="$2"
  grep "^${key}=" "$file" | head -n 1 | cut -d= -f2- | tr -d '\r'
}

LIVE_REF="$(get_env_value SUPABASE_URL "$LIVE_ENV" | sed -E 's#https://([^.]+)\.supabase\.co#\1#')"
TEST_REF="$(get_env_value SUPABASE_URL "$TEST_ENV" | sed -E 's#https://([^.]+)\.supabase\.co#\1#')"
LIVE_PASSWORD="$(get_env_value SUPABASE_PASSWORD "$LIVE_ENV")"
TEST_PASSWORD_RAW="$(get_env_value SUPABASE_PASSWORD "$TEST_ENV")"
TEST_PASSWORD="$(printf '%s' "$TEST_PASSWORD_RAW" | sed -E 's/^\[//; s/\]$//')"

if [[ -z "$LIVE_REF" || -z "$TEST_REF" || -z "$LIVE_PASSWORD" || -z "$TEST_PASSWORD" ]]; then
  echo "Missing Supabase connection details in live or test env files" >&2
  exit 1
fi

TEST_BACKUP="${WORK_DIR}/test-public-backup.dump"
LIVE_DUMP="${WORK_DIR}/live-public.dump"
DOCKER_CMD="sudo docker"

echo "Ensuring PostgreSQL 17 client image is available..."
$DOCKER_CMD image inspect postgres:17 >/dev/null 2>&1 || $DOCKER_CMD pull postgres:17 >/dev/null

run_live_psql() {
  PGPASSWORD="$LIVE_PASSWORD" psql \
    -h "$LIVE_POOLER_HOST" \
    -p 5432 \
    -U "postgres.${LIVE_REF}" \
    -d postgres \
    "$@"
}

run_test_psql() {
  PGPASSWORD="$TEST_PASSWORD" psql \
    -h "$TEST_POOLER_HOST" \
    -p 5432 \
    -U "postgres.${TEST_REF}" \
    -d postgres \
    "$@"
}

run_live_dump() {
  $DOCKER_CMD run --rm \
    -e PGPASSWORD="$LIVE_PASSWORD" \
    -v "$WORK_DIR:/work" \
    postgres:17 pg_dump \
    -h "$LIVE_POOLER_HOST" \
    -p 5432 \
    -U "postgres.${LIVE_REF}" \
    -d postgres \
    "$@"
}

run_test_dump() {
  $DOCKER_CMD run --rm \
    -e PGPASSWORD="$TEST_PASSWORD" \
    -v "$WORK_DIR:/work" \
    postgres:17 pg_dump \
    -h "$TEST_POOLER_HOST" \
    -p 5432 \
    -U "postgres.${TEST_REF}" \
    -d postgres \
    "$@"
}

run_test_restore() {
  $DOCKER_CMD run --rm \
    -e PGPASSWORD="$TEST_PASSWORD" \
    -v "$WORK_DIR:/work" \
    postgres:17 pg_restore \
    -h "$TEST_POOLER_HOST" \
    -p 5432 \
    -U "postgres.${TEST_REF}" \
    -d postgres \
    "$@"
}

echo "Validating live and test database connectivity..."
PGCONNECT_TIMEOUT=10 run_live_psql -v ON_ERROR_STOP=1 -c 'select 1' >/dev/null
PGCONNECT_TIMEOUT=10 run_test_psql -v ON_ERROR_STOP=1 -c 'select 1' >/dev/null

echo "Backing up current test public schema and data to $TEST_BACKUP"
run_test_dump \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file="/work/$(basename "$TEST_BACKUP")"

echo "Dumping live public schema and data to $LIVE_DUMP"
run_live_dump \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-privileges \
  --file="/work/$(basename "$LIVE_DUMP")"

echo "Restoring live public schema and data into test..."
run_test_restore \
  --clean \
  --if-exists \
  --disable-triggers \
  --no-owner \
  --no-privileges \
  "/work/$(basename "$LIVE_DUMP")"

echo "Verifying core table counts..."
verify_counts() {
  local side="$1"

  if [[ "$side" = "live" ]]; then
    run_live_psql \
      -At \
      -F '|' \
      -v ON_ERROR_STOP=1 <<'SQL'
SELECT table_name, row_count
FROM (
  SELECT 'users' AS table_name, count(*)::bigint AS row_count FROM public.users
  UNION ALL
  SELECT 'tenants', count(*)::bigint FROM public.tenants
  UNION ALL
  SELECT 'items', count(*)::bigint FROM public.items
  UNION ALL
  SELECT 'purchase_orders', count(*)::bigint FROM public.purchase_orders
) counts
ORDER BY table_name;
SQL
  else
    run_test_psql \
      -At \
      -F '|' \
      -v ON_ERROR_STOP=1 <<'SQL'
SELECT table_name, row_count
FROM (
  SELECT 'users' AS table_name, count(*)::bigint AS row_count FROM public.users
  UNION ALL
  SELECT 'tenants', count(*)::bigint FROM public.tenants
  UNION ALL
  SELECT 'items', count(*)::bigint FROM public.items
  UNION ALL
  SELECT 'purchase_orders', count(*)::bigint FROM public.purchase_orders
) counts
ORDER BY table_name;
SQL
  fi
}

echo "LIVE_COUNTS"
verify_counts live
echo "TEST_COUNTS"
verify_counts test

echo "Refresh complete. Test backup saved at: $TEST_BACKUP"