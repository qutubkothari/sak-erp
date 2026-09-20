#!/usr/bin/env bash
set -euo pipefail

# Create one verified Mizantra backup without applying the normal retention
# policy. Use this only when a scheduled backup was skipped or after a
# recovery; it deliberately preserves all existing archives.
backup_dir=/root/sak-vps-backups
app_dir=/var/www/sak-erp-test
minimum_free_kb=10485760

[[ "$(readlink -f "$app_dir")" == "$app_dir" ]]
mkdir -p "$backup_dir"
available_kb="$(df --output=avail -k "$backup_dir" | tail -1 | tr -d ' ')"
if (( available_kb < minimum_free_kb )); then
  echo "Backup not started: less than 10 GB is available." >&2
  exit 1
fi

stamp="$(date +%Y%m%d-%H%M%S)"
final_archive="$backup_dir/sak-erp-test-code-$stamp.tar.gz"
partial_archive="$final_archive.partial"
trap 'rm -f "$partial_archive"' EXIT

tar \
  --exclude='sak-erp-test/node_modules' \
  --exclude='sak-erp-test/.next/cache' \
  --exclude='sak-erp-test/backups' \
  --exclude='sak-erp-test/*.tar.gz' \
  --exclude='sak-erp-test/*.tgz' \
  -czf "$partial_archive" \
  -C /var/www sak-erp-test
gzip -t "$partial_archive"
mv "$partial_archive" "$final_archive"
trap - EXIT

printf 'Verified catch-up backup: %s (%s bytes)\n' \
  "$final_archive" "$(stat -c '%s' "$final_archive")"
