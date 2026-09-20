#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: $0 <app-root> <api-process> <web-process> <api-port> <web-port> <archive>" >&2
  exit 64
fi

app_root="$(readlink -f "$1")"
api_process="$2"
web_process="$3"
api_port="$4"
web_port="$5"
archive="$(readlink -f "$6")"
target="${SAK_DEPLOY_TARGET:-}"
release_id="c25783a4"
expected_sha="c25783a40a2a89ab7f2ffa8db76a3e07ae92f4ad20d13b02980aa8c930bf4b77"

case "$app_root" in
  /var/www/sak-erp)
    expected_target=live
    expected_host=72.62.192.228
    expected_ssh_user=qutubk
    public_url=https://erp.saifseas.com
    ;;
  /var/www/sak-erp-test)
    expected_target=test
    expected_host=200.141.1.206
    expected_ssh_user=root
    public_url=https://mizantra.saksolution.com
    ;;
  *) echo "refusing unexpected application root: $app_root" >&2; exit 65 ;;
esac

if [[ "$target" != "$expected_target" ]]; then
  echo "deployment blocked: set SAK_DEPLOY_TARGET=$expected_target for $app_root" >&2
  exit 65
fi

node "$app_root/scripts/assert-deployment-target.cjs" \
  --target "$target" \
  --host "$expected_host" \
  --ssh-user "$expected_ssh_user" \
  --app-root "$app_root" \
  --api-process "$api_process" \
  --web-process "$web_process" \
  --api-port "$api_port" \
  --web-port "$web_port" \
  --public-url "$public_url"

test -f "$archive"
echo "$expected_sha  $archive" | sha256sum -c -

paths=(
  apps/api/src
  apps/api/dist
  apps/web/src
  apps/web/lib
  apps/web/public
  apps/web/.next
)

for path in "${paths[@]}"; do
  test -e "$app_root/$path"
  test ! -e "$app_root/$path.pre-$release_id"
done

rollback() {
  status=$?
  trap - ERR
  if [ "$status" -eq 0 ]; then
    return
  fi
  echo "release failed; restoring previous runtime" >&2
  pm2 stop "$api_process" "$web_process" >/dev/null 2>&1 || true
  for path in "${paths[@]}"; do
    if [ -e "$app_root/$path.pre-$release_id" ]; then
      rm -rf -- "$app_root/$path"
      mv -- "$app_root/$path.pre-$release_id" "$app_root/$path"
    fi
  done
  pm2 restart "$api_process" "$web_process" --update-env >/dev/null 2>&1 || true
  exit "$status"
}
trap rollback ERR

cd "$app_root"
for path in "${paths[@]}"; do
  mv -- "$path" "$path.pre-$release_id"
done

tar -xzf "$archive" -C "$app_root"
test -f apps/api/dist/main.js
test -f apps/web/.next/BUILD_ID

pm2 restart "$api_process" --update-env >/dev/null
pm2 restart "$web_process" --update-env >/dev/null

api_ok=0
web_ok=0
for _ in $(seq 1 30); do
  api_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$api_port/api/v1/auth/me" || true)"
  web_status="$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:$web_port/login" || true)"
  if [ "$api_status" = "401" ]; then api_ok=1; fi
  if [ "$web_status" = "200" ] || [ "$web_status" = "307" ]; then web_ok=1; fi
  if [ "$api_ok" -eq 1 ] && [ "$web_ok" -eq 1 ]; then break; fi
  sleep 1
done

test "$api_ok" -eq 1
test "$web_ok" -eq 1
pm2 describe "$api_process" | grep -q 'online'
pm2 describe "$web_process" | grep -q 'online'

trap - ERR
printf '%s\n' "$release_id" > "$app_root/.common-release"
echo "COMMON_RELEASE_DEPLOYED release=$release_id api=$api_status web=$web_status"
