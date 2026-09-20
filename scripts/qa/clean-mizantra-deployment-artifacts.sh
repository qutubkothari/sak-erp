#!/usr/bin/env bash
set -euo pipefail

# Mizantra server hygiene only. This script deliberately excludes databases,
# uploads, application source, /root/backups and /root/sak-vps-backups.
app=/var/www/sak-erp-test
backup_root=/root/sak-deploy-backups
keep_backups=6
log=/root/mizantra-artifact-cleanup-$(date +%Y%m%d-%H%M%S).log

[[ "$(readlink -f "$app")" == "$app" ]]
[[ "$(readlink -f "$backup_root")" == "$backup_root" ]]
[[ -d "$app/apps/web/.next" ]]

before="$(df -B1 / | awk 'NR==2 {print $3}')"
{
  echo "Mizantra deployment-artifact cleanup $(date -Is)"
  echo "Keeping $keep_backups newest rollback snapshots under $backup_root"
} | tee "$log"

mapfile -t old_backups < <(
  find "$backup_root" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr \
    | awk -v keep="$keep_backups" 'NR > keep {sub(/^[^ ]+ /, ""); print}'
)
for path in "${old_backups[@]}"; do
  resolved="$(readlink -f "$path")"
  [[ "$resolved" == "$backup_root"/* ]] || { echo "Refusing backup path: $path" | tee -a "$log"; exit 1; }
  echo "Removing obsolete rollback snapshot: $resolved" | tee -a "$log"
  rm -rf -- "$resolved"
done

while IFS= read -r -d '' path; do
  resolved="$(readlink -f "$path")"
  [[ "$resolved" == /tmp/* ]] || { echo "Refusing temporary path: $path" | tee -a "$log"; exit 1; }
  echo "Removing stale deployment staging: $resolved" | tee -a "$log"
  rm -rf -- "$resolved"
done < <(
  find /tmp -mindepth 1 -maxdepth 1 -mtime +1 \
    \( -name 'mizantra-*' -o -name 'mrp-*' -o -name 'tmp.*' \) \
    -print0
)

find /root/.npm/_logs -type f -mtime +7 -delete 2>/dev/null || true
after="$(df -B1 / | awk 'NR==2 {print $3}')"
freed=$((before - after))
printf 'Freed_bytes=%s\n' "$freed" | tee -a "$log"
df -h / | tee -a "$log"
