#!/usr/bin/env bash
set -euo pipefail

before=$(df -B1 / | awk 'NR==2 {print $3}')

safe_remove_tree() {
  local target=$1 resolved
  [[ -e "$target" ]] || return 0
  resolved=$(readlink -f -- "$target")
  case "$resolved" in
    /var/www/sak-erp-test/backups|\
    /var/www/sak-erp-test/apps/web/.next.pre-*|\
    /var/www/sak-erp-test/apps/web/.next.prev-deploy|\
    /var/www/sak-erp-test/apps/api/dist.pre-*|\
    /var/www/sak-erp-test/apps/web/.next/cache|\
    /var/www/sak-erp/apps/web/.next/cache|\
    /home/qutubk/.gradle/caches)
      rm -rf -- "$resolved"
      ;;
    *)
      echo "Refusing unexpected cleanup target: $resolved" >&2
      exit 1
      ;;
  esac
}

# Old former-test rollback material. Current builds and the latest August archive are retained.
safe_remove_tree /var/www/sak-erp-test/backups
for target in /var/www/sak-erp-test/apps/web/.next.pre-* /var/www/sak-erp-test/apps/api/dist.pre-*; do
  safe_remove_tree "$target"
done
safe_remove_tree /var/www/sak-erp-test/apps/web/.next.prev-deploy

# Build caches are reproducible and are not required by running Next.js applications.
safe_remove_tree /var/www/sak-erp-test/apps/web/.next/cache
safe_remove_tree /var/www/sak-erp/apps/web/.next/cache
safe_remove_tree /home/qutubk/.gradle/caches

# Explicit obsolete test rollback archives; preserve backup-20260821-110455.tar.gz.
rm -f -- \
  /var/www/sak-erp-test/backup-20260729-221838.tar.gz \
  /var/www/sak-erp-test/backup-hr-performance-20260729225052.tar.gz

# Recreate expected cache/backup roots with their original owner.
install -d -o qutubk -g qutubk /var/www/sak-erp-test/backups /home/qutubk/.gradle/caches

# Safe package/log retention cleanup.
sudo -u qutubk npm cache clean --force >/dev/null 2>&1 || true
journalctl --vacuum-size=100M >/dev/null

after=$(df -B1 / | awk 'NR==2 {print $3}')
freed=$((before-after))
echo "freed_bytes=$freed"
df -hT /
