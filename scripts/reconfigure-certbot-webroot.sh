#!/usr/bin/env bash
set -euo pipefail

ACME_ROOT="/var/www/letsencrypt"

mkdir -p "$ACME_ROOT/.well-known/acme-challenge"

cp /etc/nginx/sites-available/pms.saksolution.com /etc/nginx/sites-available/pms.saksolution.com.bak-20260415-webroot
cp /etc/nginx/sites-available/pmstest.saksolution.com /etc/nginx/sites-available/pmstest.saksolution.com.bak-20260415-webroot
cp /etc/letsencrypt/renewal/pms.saksolution.com.conf /etc/letsencrypt/renewal/pms.saksolution.com.conf.bak-20260415-webroot
cp /etc/letsencrypt/renewal/pmstest.saksolution.com.conf /etc/letsencrypt/renewal/pmstest.saksolution.com.conf.bak-20260415-webroot

cat > /etc/nginx/sites-available/pms.saksolution.com <<'EOF'
server {
    server_name pms.saksolution.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }

    location /api/v1/ {
        proxy_pass http://127.0.0.1:4000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/pms.saksolution.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pms.saksolution.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name pms.saksolution.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}
EOF

cat > /etc/nginx/sites-available/pmstest.saksolution.com <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name pmstest.saksolution.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name pmstest.saksolution.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }

    ssl_certificate /etc/letsencrypt/live/pmstest.saksolution.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pmstest.saksolution.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
EOF

nginx -t
systemctl reload nginx

rm -rf /var/lib/letsencrypt/temp_checkpoint

certbot reconfigure --cert-name pms.saksolution.com --webroot -w "$ACME_ROOT" --deploy-hook "systemctl reload nginx" -n
certbot reconfigure --cert-name pmstest.saksolution.com --webroot -w "$ACME_ROOT" --deploy-hook "systemctl reload nginx" -n

sed -i '/^installer = nginx$/d' /etc/letsencrypt/renewal/pms.saksolution.com.conf
sed -i '/^installer = nginx$/d' /etc/letsencrypt/renewal/pmstest.saksolution.com.conf

rm -rf /var/lib/letsencrypt/temp_checkpoint
certbot renew --dry-run --cert-name pms.saksolution.com
certbot renew --dry-run --cert-name pmstest.saksolution.com

echo "--- Pms renewal config ---"
sed -n '1,220p' /etc/letsencrypt/renewal/pms.saksolution.com.conf
echo "--- Pmstest renewal config ---"
sed -n '1,220p' /etc/letsencrypt/renewal/pmstest.saksolution.com.conf