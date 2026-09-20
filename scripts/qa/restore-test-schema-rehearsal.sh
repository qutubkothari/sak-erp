#!/usr/bin/env bash
set -euo pipefail

container=sak-release-rehearsal
schema_dump=/tmp/mizantra-schema-20260904.sql
restore_log=/tmp/mizantra-schema-restore.log

[[ "$(sudo docker inspect --format '{{.Name}}' "$container")" == "/$container" ]]
[[ -s "$schema_dump" ]]

set +e
sudo docker exec -i "$container" psql -U postgres -d testschema -v ON_ERROR_STOP=0 \
  < "$schema_dump" > "$restore_log" 2>&1
restore_rc=$?
set -e

echo "test_schema_restore_rc=$restore_rc"
tail -20 "$restore_log"
printf 'liveclone_tables='
sudo docker exec "$container" psql -U postgres -d liveclone -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
printf 'testschema_tables='
sudo docker exec "$container" psql -U postgres -d testschema -Atc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
