#!/usr/bin/env bash
set -euo pipefail

# Read-only Mizantra operational watchdog. It records health; it never
# restarts services, deletes data, or changes application configuration.
app=/var/www/sak-erp-test
state_dir="$app/artifacts/ops"
state_file="$state_dir/mizantra-health-latest.json"
history_file="$state_dir/mizantra-health-history.ndjson"
# Warn early enough to preserve room for a safe rollback and a web rebuild.
# Critical remains deliberately high: the watchdog reports only and never
# performs a destructive clean-up or an automatic restart.
disk_warning=75
disk_critical=90
backup_warning_hours=30
backup_critical_hours=48

[[ "$(readlink -f "$app")" == "$app" ]]
mkdir -p "$state_dir"

disk_used="$(df -P / | awk 'NR==2 {gsub(/%/, "", $5); print $5}')"
disk_available="$(df -P -B1 / | awk 'NR==2 {print $4}')"
backup_dir=/root/sak-vps-backups
latest_backup="$({ find "$backup_dir" -maxdepth 1 -type f -name 'sak-erp-test-code-*.tar.gz' -printf '%T@ %p\n' 2>/dev/null || true; } | sort -nr | head -1 | cut -d' ' -f2-)"
backup_status="MISSING"
backup_age_hours="null"
backup_size_bytes=0
if [[ -n "$latest_backup" && -f "$latest_backup" ]]; then
  backup_size_bytes="$(stat -c '%s' "$latest_backup")"
  backup_age_hours="$(( ($(date +%s) - $(stat -c '%Y' "$latest_backup")) / 3600 ))"
  backup_status="CURRENT"
fi
api_http="$(curl -sS --max-time 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:4001/api/v1/active-planner/conversations || true)"
web_http="$(curl -sS --max-time 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/dashboard/active-planner || true)"
pm2_json="$(pm2 jlist 2>/dev/null || printf '[]')"
api_status="$(printf '%s' "$pm2_json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const p=JSON.parse(s).find(x=>x.name==='sak-api-test');process.stdout.write(p?.pm2_env?.status||'missing')}catch{process.stdout.write('unknown')}})")"
web_status="$(printf '%s' "$pm2_json" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const p=JSON.parse(s).find(x=>x.name==='sak-web-test');process.stdout.write(p?.pm2_env?.status||'missing')}catch{process.stdout.write('unknown')}})")"

severity="OK"
issues=()
if (( disk_used >= disk_critical )); then severity="CRITICAL"; issues+=("disk_critical");
elif (( disk_used >= disk_warning )); then severity="WARNING"; issues+=("disk_warning"); fi
if [[ "$backup_status" == "MISSING" ]]; then
  severity="CRITICAL"; issues+=("backup_missing")
elif (( backup_age_hours >= backup_critical_hours )); then
  severity="CRITICAL"; backup_status="STALE"; issues+=("backup_critical")
elif (( backup_age_hours >= backup_warning_hours )); then
  [[ "$severity" == "OK" ]] && severity="WARNING"
  backup_status="STALE"; issues+=("backup_stale")
fi
if [[ "$api_status" != "online" ]]; then severity="CRITICAL"; issues+=("api_process_$api_status"); fi
if [[ "$web_status" != "online" ]]; then severity="CRITICAL"; issues+=("web_process_$web_status"); fi
if [[ ! "$api_http" =~ ^(401|403)$ ]]; then severity="CRITICAL"; issues+=("api_http_$api_http"); fi
if [[ "$web_http" != "200" ]]; then severity="CRITICAL"; issues+=("web_http_$web_http"); fi

timestamp="$(date -Is)"
issues_json="$(printf '%s\n' "${issues[@]:-}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=s.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);process.stdout.write(JSON.stringify(a))})")"
payload="$(printf '{\"checked_at\":\"%s\",\"severity\":\"%s\",\"disk_used_percent\":%s,\"disk_available_bytes\":%s,\"backup\":{\"status\":\"%s\",\"age_hours\":%s,\"size_bytes\":%s},\"api\":{\"pm2_status\":\"%s\",\"http\":%s},\"web\":{\"pm2_status\":\"%s\",\"http\":%s},\"issues\":%s}\n' "$timestamp" "$severity" "$disk_used" "$disk_available" "$backup_status" "$backup_age_hours" "$backup_size_bytes" "$api_status" "$api_http" "$web_status" "$web_http" "$issues_json")"

temp_file="$state_dir/.mizantra-health-$$.json"
printf '%s' "$payload" > "$temp_file"
mv -f "$temp_file" "$state_file"
printf '%s\n' "$payload" >> "$history_file"
tail -n 4320 "$history_file" > "$history_file.tmp" && mv -f "$history_file.tmp" "$history_file"

if [[ "$severity" != "OK" ]]; then
  logger -t mizantra-health-watchdog "$payload"
  printf '%s\n' "$payload" >&2
  exit 2
fi
