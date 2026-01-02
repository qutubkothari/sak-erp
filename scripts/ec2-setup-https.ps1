# Sets up HTTPS (Let's Encrypt) on the EC2 host using Nginx reverse proxy.
# - Installs nginx + certbot
# - Configures reverse proxy for Next.js (3000) and Nest API (4000)
# - Requests/renews TLS cert for the domain and redirects HTTP -> HTTPS

param(
  [string]$Ec2Ip = "3.110.100.60",
  [string]$Ec2User = "ubuntu",
  [string]$KeyPath = ".\\saif-erp.pem",
  [string]$Domain = "erp.saksolution.com",
  [string]$CertEmail = "erpsak53@gmail.com",
  [int]$WebPort = 3000,
  [int]$ApiPort = 4000
)

$ErrorActionPreference = "Stop"

function Assert-CommandExists($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Required command not found: $name" }
}

function Invoke-Ssh([string]$remoteCommand) {
  & ssh.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=25 -i $KeyPath "$Ec2User@$Ec2Ip" $remoteCommand
}

function ScpToEc2([string]$localPath, [string]$remotePath) {
  & scp.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i $KeyPath $localPath "$Ec2User@${Ec2Ip}:$remotePath"
}

function Write-Utf8NoBomFile([string]$path, [string]$content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  # Ensure LF-only endings for bash on Linux
  $normalized = $content -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($path, $normalized, $utf8NoBom)
}

Write-Host "`n=== EC2 HTTPS Setup (Nginx + Let's Encrypt) ===" -ForegroundColor Cyan
Write-Host "EC2: $Ec2User@$Ec2Ip" -ForegroundColor Gray
Write-Host "Domain: $Domain" -ForegroundColor Gray

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found at: $KeyPath"
}

Assert-CommandExists "ssh"
Assert-CommandExists "scp"

# 1) Quick connectivity check
Write-Host "`n[1/5] Checking SSH connectivity..." -ForegroundColor Yellow
Invoke-Ssh "bash -lc 'echo ok; uname -a; node -v || true; pm2 -v || true'" | Out-Host

# 2) Upload nginx site config
Write-Host "`n[2/5] Creating Nginx config..." -ForegroundColor Yellow

$nginxConfTemplate = @'
upstream api_backend {
  server 127.0.0.1:__APIPORT__;
  keepalive 32;
}

upstream web_frontend {
  server 127.0.0.1:__WEBPORT__;
  keepalive 32;
}

server {
  listen 80;
  listen [::]:80;
  server_name __DOMAIN__;

  # LetsEncrypt challenge
  location ^~ /.well-known/acme-challenge/ {
    root /var/www/html;
    allow all;
  }

  # API (Nest global prefix is /api/v1)
  location ^~ /api/v1/ {
    proxy_pass http://api_backend/api/v1/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # GraphQL (if used)
  location ^~ /graphql {
    proxy_pass http://api_backend/graphql;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Uploaded files served by API
  location ^~ /uploads/ {
    proxy_pass http://api_backend/uploads/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Frontend (Next.js)
  location / {
    proxy_pass http://web_frontend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
'@

$nginxConf = $nginxConfTemplate.
  Replace('__APIPORT__', "$ApiPort").
  Replace('__WEBPORT__', "$WebPort").
  Replace('__DOMAIN__', $Domain)

$tmp = Join-Path $env:TEMP ("sak-erp-nginx-{0}.conf" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  Write-Utf8NoBomFile $tmp $nginxConf
  ScpToEc2 $tmp "/tmp/sak-erp-nginx.conf" | Out-Host
} finally {
  Remove-Item -Path $tmp -Force -ErrorAction SilentlyContinue
}

# 3) Install nginx + certbot and enable site
Write-Host "`n[3/5] Installing Nginx + Certbot and enabling site..." -ForegroundColor Yellow
$remoteSetup = @"
set -e
sudo apt-get update -y
sudo apt-get install -y nginx

# certbot via snap (recommended on Ubuntu)
if ! command -v certbot >/dev/null 2>&1; then
  if ! command -v snap >/dev/null 2>&1; then
    sudo apt-get install -y snapd
  fi
  sudo snap install core >/dev/null 2>&1 || true
  sudo snap refresh core >/dev/null 2>&1 || true
  sudo snap install --classic certbot
  sudo ln -sf /snap/bin/certbot /usr/bin/certbot
fi

sudo mkdir -p /var/www/html
sudo mv /tmp/sak-erp-nginx.conf /etc/nginx/sites-available/sak-erp
sudo rm -f /etc/nginx/sites-enabled/default || true
sudo ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/sak-erp
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
"@

$tmpSetup = Join-Path $env:TEMP ("sak-erp-https-setup-{0}.sh" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  Write-Utf8NoBomFile $tmpSetup $remoteSetup
  ScpToEc2 $tmpSetup "/tmp/sak-erp-https-setup.sh" | Out-Host
} finally {
  Remove-Item -Path $tmpSetup -Force -ErrorAction SilentlyContinue
}

Invoke-Ssh "bash -lc 'chmod +x /tmp/sak-erp-https-setup.sh; /tmp/sak-erp-https-setup.sh'" | Out-Host

# 4) Request certificate and enable HTTP->HTTPS redirect
Write-Host "`n[4/5] Requesting Let's Encrypt certificate..." -ForegroundColor Yellow
$remoteCert = @"
set -e
sudo certbot --nginx -d ${Domain} --non-interactive --agree-tos --email ${CertEmail} --redirect
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
"@

$tmpCert = Join-Path $env:TEMP ("sak-erp-https-cert-{0}.sh" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  Write-Utf8NoBomFile $tmpCert $remoteCert
  ScpToEc2 $tmpCert "/tmp/sak-erp-https-cert.sh" | Out-Host
} finally {
  Remove-Item -Path $tmpCert -Force -ErrorAction SilentlyContinue
}

Invoke-Ssh "bash -lc 'chmod +x /tmp/sak-erp-https-cert.sh; /tmp/sak-erp-https-cert.sh'" | Out-Host

# 5) Validate
Write-Host "`n[5/5] Validating HTTPS..." -ForegroundColor Yellow

$remoteValidate = @"
set -e
curl -I -L https://${Domain} | head -n 5
echo '---'
curl -s -o /dev/null -w '%{http_code}' https://${Domain}/api/v1 || true
echo
"@

$tmpVal = Join-Path $env:TEMP ("sak-erp-https-validate-{0}.sh" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  Write-Utf8NoBomFile $tmpVal $remoteValidate
  ScpToEc2 $tmpVal "/tmp/sak-erp-https-validate.sh" | Out-Host
} finally {
  Remove-Item -Path $tmpVal -Force -ErrorAction SilentlyContinue
}

Invoke-Ssh "bash -lc 'chmod +x /tmp/sak-erp-https-validate.sh; /tmp/sak-erp-https-validate.sh'" | Out-Host

Write-Host "`n✅ HTTPS enabled: https://${Domain}" -ForegroundColor Green
Write-Host "If certbot failed, check DNS A record points to $Ec2Ip and port 80/443 are open in the EC2 Security Group." -ForegroundColor Yellow
