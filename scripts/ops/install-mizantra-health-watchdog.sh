#!/usr/bin/env bash
set -euo pipefail

watchdog=/usr/local/sbin/mizantra-health-watchdog
lock=/var/run/mizantra-health-watchdog.lock
log=/var/log/mizantra-health-watchdog.log
line="*/10 * * * * flock -n $lock $watchdog >> $log 2>&1"

[[ -x "$watchdog" ]]
current="$(crontab -l 2>/dev/null || true)"
if ! grep -Fqx "$line" <<<"$current"; then
  printf '%s\n%s\n' "$current" "$line" | crontab -
fi
crontab -l | grep -Fqx "$line"
