#!/usr/bin/env bash
set -euo pipefail

NGINX_CONF="/etc/nginx/nginx.conf"
BACKUP_PATH="/etc/nginx/nginx.conf.bak-20260415-certbot-fix"

cp "$NGINX_CONF" "$BACKUP_PATH"
sed -i '\|include /etc/letsencrypt/le_http_01_cert_challenge.conf;|d' "$NGINX_CONF"
nginx -t
systemctl reload nginx

rm -rf /var/lib/letsencrypt/temp_checkpoint
certbot certonly --nginx --dry-run -n --agree-tos -d pms.saksolution.com