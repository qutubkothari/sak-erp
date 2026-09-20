param(
  [string]$HostIp = "200.141.1.206",
  [string]$User = "root",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\hostinger_ed25519",
  [int]$WebPort = 3001,
  [int]$ApiPort = 4001
)

$ErrorActionPreference = "Stop"

function Invoke-NewVpsSsh($remoteCommand) {
  & ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=20 -i $KeyPath "$User@$HostIp" $remoteCommand
  if ($LASTEXITCODE -ne 0) {
    throw "New VPS SSH command failed with exit code $LASTEXITCODE"
  }
}

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

Write-Host "Bootstrapping new VPS: $User@$HostIp" -ForegroundColor Cyan

$remote = @"
set -e
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y curl ca-certificates gnupg nginx git build-essential

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

corepack enable || true
corepack prepare pnpm@9.0.0 --activate || npm install -g pnpm@9.0.0

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

mkdir -p /var/www/sak-erp-test
cat >/etc/nginx/sites-available/sak-erp-test-ip.conf <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://127.0.0.1:$ApiPort/api/;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:$WebPort;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/sak-erp-test-ip.conf /etc/nginx/sites-enabled/sak-erp-test-ip.conf
nginx -t
systemctl enable nginx
systemctl reload nginx

pm2 startup systemd -u root --hp /root >/tmp/pm2-startup.log 2>&1 || true

node -v
pnpm -v
pm2 -v
df -h /
"@

$escaped = $remote.Replace("'", "'\''")
Invoke-NewVpsSsh "bash -lc '$escaped'"

Write-Host "New VPS bootstrap complete. Next run: .\deploy-new-vps-test.ps1" -ForegroundColor Green
