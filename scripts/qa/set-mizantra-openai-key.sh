#!/usr/bin/env bash
set -euo pipefail

read -r planner_key
test -n "$planner_key"
case "$planner_key" in sk-*) ;; *) echo 'Invalid OpenAI key format.' >&2; exit 1;; esac

target=/var/www/sak-erp-test/apps/api/.env
backup=/root/sak-deploy-backups/mizantra-openai-env-$(date +%Y%m%d-%H%M%S)
test -f "$target"
mkdir -p "$backup"
cp "$target" "$backup/.env"

if grep -q '^OPENAI_API_KEY=' "$target"; then
  sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$planner_key|" "$target"
else
  printf '\nOPENAI_API_KEY=%s\n' "$planner_key" >> "$target"
fi

grep -q '^OPENAI_API_KEY=sk-' "$target"
pm2 restart sak-api-test --update-env
pm2 save
echo "Mizantra TEST key configured. Backup: $backup"
