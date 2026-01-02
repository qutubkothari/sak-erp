#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/sak-erp/apps/api

ts=$(date +%Y%m%d-%H%M%S)
cp -a .env ".env.bak.${ts}" || true

key_line=$(grep -m1 '^OPENAI_API_KEY=' /tmp/sak-openai.env | tr -d '\r' || true)
if [[ -z "${key_line}" ]]; then
  echo "NO_KEY_IN_UPLOADED_FILE" >&2
  exit 1
fi

# Replace any existing line (idempotent)
{ grep -v '^OPENAI_API_KEY=' .env 2>/dev/null || true; echo "${key_line}"; } > .env.tmp
mv .env.tmp .env
rm -f /tmp/sak-openai.env

pm2 restart sak-api
