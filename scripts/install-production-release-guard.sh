#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$#" -ne 2 ]]; then
  echo "usage: $0 <live|test|arwa> <app-root>" >&2
  exit 64
fi

target="$1"
app_root="$(readlink -f "$2")"
export SAK_DEPLOY_TARGET="$target"

case "$target:$app_root" in
  live:/var/www/sak-erp-v3)
    host=72.62.192.228; ssh_user=qutubk; api=sak-v2-api; web=sak-v2-web
    api_port=4000; web_port=3000; public_url=https://erp.saifseas.com
    ;;
  test:/var/www/sak-erp-test)
    host=200.141.1.206; ssh_user=root; api=sak-api-test; web=sak-web-test
    api_port=4001; web_port=3001; public_url=https://mizantra.saksolution.com
    ;;
  arwa:/var/www/arwa-mizantra)
    host=200.141.1.206; ssh_user=root; api=arwa-mizantra-api; web=arwa-mizantra-web
    api_port=4002; web_port=3004; public_url=https://arwa.mizantra.ae
    ;;
  *) echo "production release guard refused unexpected target/root" >&2; exit 65 ;;
esac

cd "$app_root"
node scripts/assert-deployment-target.cjs \
  --target "$target" --host "$host" --ssh-user "$ssh_user" \
  --app-root "$app_root" --api-process "$api" --web-process "$web" \
  --api-port "$api_port" --web-port "$web_port" --public-url "$public_url"

git_dir="$(git rev-parse --absolute-git-dir)"
hooks_dir="$git_dir/release-hooks"
mkdir -p "$hooks_dir"
install -m 0755 scripts/git-hooks/reference-transaction "$hooks_dir/reference-transaction"
git config core.hooksPath "$hooks_dir"

test "$(git config --get core.hooksPath)" = "$hooks_dir"
test -x "$hooks_dir/reference-transaction"
printf 'PRODUCTION_RELEASE_GUARD_INSTALLED target=%s root=%s hooks=%s current_sha=%s\n' \
  "$target" "$app_root" "$hooks_dir" "$(git rev-parse HEAD)"
