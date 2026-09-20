#!/usr/bin/env bash
set -Eeuo pipefail

app_root="$(readlink -f "${1:?app root required}")"
backup_root="$(readlink -f "${2:?backup root required}")"
test "$app_root" = /var/www/sak-erp
test "$backup_root" = /var/www/sak-erp-release-backups/code-before-c25783a4
(cd "$backup_root" && sha256sum -c SHA256SUMS >/dev/null)
test "$(cat "$app_root/.common-release")" = c25783a4

targets=(
  "$app_root/apps/api/src.pre-c25783a4"
  "$app_root/apps/api/dist.pre-c25783a4"
  "$app_root/apps/web/src.pre-c25783a4"
  "$app_root/apps/web/lib.pre-c25783a4"
  "$app_root/apps/web/public.pre-c25783a4"
  "$app_root/apps/web/.next.pre-c25783a4"
)

for target in "${targets[@]}"; do
  resolved="$(readlink -f "$target")"
  case "$resolved" in
    "$app_root"/*.pre-c25783a4) ;;
    *) echo "unsafe cleanup target: $resolved" >&2; exit 65 ;;
  esac
done

rm -rf -- "${targets[@]}"

if sudo -n docker ps -a --format '{{.Names}}' | grep -qx sak-release-rehearsal; then
  sudo -n docker stop sak-release-rehearsal >/dev/null
  sudo -n docker rm sak-release-rehearsal >/dev/null
fi
sudo -n docker image rm djrobstep/migra:latest python:3.11-slim postgres:17 >/dev/null 2>&1 || true

df -h / | tail -1
echo "COMMON_RELEASE_STAGING_CLEANED"
