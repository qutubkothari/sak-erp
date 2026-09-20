#!/usr/bin/env bash
set -Eeuo pipefail

inventory_script="$(readlink -f "${1:?inventory script required}")"
app_root="$(readlink -f "${2:?app root required}")"
base_url="${3:?base URL required}"

routes_file="$(mktemp)"
trap 'rm -f "$routes_file"' EXIT
"$inventory_script" "$app_root" saif-enabled-routes > "$routes_file"

total=0
good=0
bad=0
while IFS= read -r route; do
  [ -n "$route" ] || continue
  total=$((total + 1))
  code="$(curl -sS -o /dev/null -w '%{http_code}' "$base_url$route")"
  case "$code" in
    200|307) good=$((good + 1)) ;;
    *) bad=$((bad + 1)); echo "BAD $code $route" ;;
  esac
done < "$routes_file"

echo "ENABLED_ROUTE_CHECK total=$total good=$good bad=$bad"
test "$total" -gt 0
test "$bad" -eq 0
