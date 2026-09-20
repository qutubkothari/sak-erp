# Hostinger VPS Setup - PowerShell Script with Password
$ErrorActionPreference = "Continue"

$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$PASSWORD = "3998"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Hostinger VPS Automated Setup" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Create setup commands
$setupCommands = @"
set -e
echo '=== Updating system ==='
sudo apt update -y

echo '=== Installing Node.js v20 ==='
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
node -v
npm -v

echo '=== Installing pnpm ==='
sudo npm install -g pnpm
pnpm -v

echo '=== Installing PM2 ==='
sudo npm install -g pm2
pm2 -v

echo '=== Setting up PM2 startup ==='
pm2 startup | grep 'sudo' | bash || true

echo '=== Creating deployment directory ==='
sudo mkdir -p /var/www/sak-erp
sudo chown -R qutubk:qutubk /var/www/sak-erp

echo '=== Installing Nginx ==='
sudo apt install -y nginx

echo '=== Configuring Nginx ==='
sudo bash -c 'cat > /etc/nginx/sites-available/sak-erp <<EOF
server {
    listen 80;
    server_name 72.62.192.228;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        client_max_body_size 50M;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        client_max_body_size 50M;
    }
}
EOF'

echo '=== Enabling Nginx site ==='
sudo ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

echo '=== Creating .env template ==='
mkdir -p /var/www/sak-erp/apps/api
cat > /var/www/sak-erp/apps/api/.env <<'ENVEOF'
DATABASE_URL="postgresql://postgres.wqjfvvkucmqvbtaekjlk:3216549870@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
SUPABASE_URL="https://wqjfvvkucmqvbtaekjlk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmt1Y21xdmJ0YWVramxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMzA2NjcsImV4cCI6MjA0OTkwNjY2N30.FO3PvP4wE8-09KjqIlgmS03_mqj8h_uQD1y2-y9GXbk"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmt1Y21xdmJ0YWVramxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMzMDY2NywiZXhwIjoyMDQ5OTA2NjY3fQ.6FUxpZ7oZL5WBFGBvkrJx5nYIVx_lnCY0RSl1w6s2pI"
JWT_SECRET="your_jwt_secret_change_this"
PORT=4000
NODE_ENV=production
ENVEOF

echo '=== Setup Complete! ==='
echo 'Node.js:' \$(node -v)
echo 'pnpm:' \$(pnpm -v)
echo 'PM2:' \$(pm2 -v)
echo 'Nginx: Running'
echo 'Ready for deployment!'
"@

# Save commands to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$setupCommands | Out-File -FilePath $tempFile -Encoding ASCII

Write-Host "Connecting to Hostinger VPS..." -ForegroundColor Yellow
Write-Host "Password will be entered automatically`n" -ForegroundColor Gray

try {
    # Use plink with password if available, otherwise use standard ssh
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    
    if ($plinkPath) {
        Write-Host "Using PuTTY plink for connection`n" -ForegroundColor Gray
        Get-Content $tempFile | & plink.exe -batch -pw $PASSWORD "$HOSTINGER_USER@$HOSTINGER_IP" "bash -s"
    } else {
        Write-Host "PuTTY not found. Please install PuTTY or use manual setup." -ForegroundColor Red
        Write-Host "`nManual Setup Instructions:" -ForegroundColor Yellow
        Write-Host "1. SSH into your server: ssh $HOSTINGER_USER@$HOSTINGER_IP" -ForegroundColor Gray
        Write-Host "2. Copy and run the commands from: setup-hostinger-vps.sh" -ForegroundColor Gray
        Write-Host "`nOr download PuTTY from: https://www.putty.org/" -ForegroundColor Gray
    }
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "1. Verify the setup completed successfully" -ForegroundColor White
Write-Host "2. Run deployment: .\deploy-hostinger.ps1" -ForegroundColor Green
Write-Host "3. Access your app: http://72.62.192.228`n" -ForegroundColor White
