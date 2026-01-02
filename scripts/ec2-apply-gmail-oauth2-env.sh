#!/usr/bin/env bash
set -euo pipefail

# Applies Gmail OAuth2 + Pub/Sub env vars to the API .env on EC2
# Expects: /tmp/sak-gmail-oauth2.env (uploaded by the companion PowerShell script)

ENV_FILE="/home/ubuntu/sak-erp/apps/api/.env"
UPLOAD="/tmp/sak-gmail-oauth2.env"

cd /home/ubuntu/sak-erp/apps/api

ts=$(date +%Y%m%d-%H%M%S)
cp -a "$ENV_FILE" "${ENV_FILE}.bak.${ts}" || true

if [[ ! -f "$UPLOAD" ]]; then
  echo "MISSING_UPLOAD_FILE" >&2
  exit 1
fi

# Normalize CRLF just in case
tr -d '\r' < "$UPLOAD" > "${UPLOAD}.clean"

# Keep everything except the keys we manage, then append the new values.
# This makes the operation idempotent.
{
  grep -v -E '^(GMAIL_CLIENT_ID|GMAIL_CLIENT_SECRET|GMAIL_REFRESH_TOKEN|GMAIL_REDIRECT_URI|GMAIL_PUBSUB_TOPIC|GMAIL_USER)=' "$ENV_FILE" 2>/dev/null || true
  cat "${UPLOAD}.clean"
} > "${ENV_FILE}.tmp"

mv "${ENV_FILE}.tmp" "$ENV_FILE"
rm -f "$UPLOAD" "${UPLOAD}.clean"

pm2 restart sak-api
