#!/usr/bin/env pwsh
# Automated Hostinger Deployment with SSH Key

$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$SSH_KEY = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$SUDO_PASSWORD = "515253"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SAK ERP - Automated Hostinger Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test SSH connection
Write-Host "[1/6] Testing SSH connection..." -ForegroundColor Yellow
ssh -i $SSH_KEY -o ConnectTimeout=10 $HOSTINGER_USER@$HOSTINGER_IP "echo 'Connected successfully'"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: SSH connection failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ SSH connection working`n" -ForegroundColor Green

# Check if repo exists, if not clone it
Write-Host "[2/6] Setting up repository..." -ForegroundColor Yellow
$repoCheck = ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP 'test -d /var/www/sak-erp && echo exists || echo not_exists'
if ($repoCheck -like "*not_exists*") {
    Write-Host "Cloning repository from GitHub..." -ForegroundColor Yellow
    ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP 'sudo mkdir -p /var/www && sudo chown -R qutubk:qutubk /var/www && git clone https://github.com/qutubkothari/sak-erp.git /var/www/sak-erp'
} else {
    Write-Host "Updating repository..." -ForegroundColor Yellow
    ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP 'cd /var/www/sak-erp && git pull origin main'
}
Write-Host "✓ Repository ready`n" -ForegroundColor Green

# Install Node.js, pnpm, PM2 if needed
Write-Host "[3/6] Installing dependencies (Node.js, pnpm, PM2)..." -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP 'bash -s' << 'BASH_SCRIPT'
# Install Node.js 20
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -S bash - <<< "515253"
    echo "515253" | sudo -S apt-get install -y nodejs
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    echo "515253" | sudo -S npm install -g pnpm
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    echo "515253" | sudo -S npm install -g pm2
fi

node -v
pnpm -v
pm2 -v
BASH_SCRIPT
Write-Host "✓ Dependencies installed`n" -ForegroundColor Green

# Build applications
Write-Host "[4/6] Building applications..." -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP @"
cd /var/www/sak-erp

# Create .env for API
cat > apps/api/.env << 'ENVEOF'
DATABASE_URL="postgresql://postgres:SAK123!1@db.wqjfvvkucmqvbtaekjlk.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:SAK123!1@db.wqjfvvkucmqvbtaekjlk.supabase.co:5432/postgres"
SUPABASE_URL="https://wqjfvvkucmqvbtaekjlk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmtjbXF2YnRhZWtqbGsiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzc2NDUyMCwiZXhwIjoyMDQ5MzQwNTIwfQ.PpW3M1MFZ_MRAb8fZ-0ww5lnxxN9QZPLmhkKGkW8HoQ"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmtjbXF2YnRhZWtqbGsiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzMzNzY0NTIwLCJleHAiOjIwNDkzNDA1MjB9.GxYJxnPRRHgLNaUfNkAL8z4_HNa9jvNfbg9PHMsgz-g"
JWT_SECRET="your-secret-key-here-change-in-production"
PORT=4000
NODE_ENV=production
ENVEOF

# Install dependencies
echo 'Installing dependencies...'
pnpm install --frozen-lockfile

# Build web
echo 'Building web app...'
cd apps/web
NEXT_PUBLIC_API_URL="/api/v1" pnpm build
cd ../..

# Build API
echo 'Building API...'
cd apps/api
pnpm build

# Generate Prisma client
pnpm prisma generate
cd ../..

echo 'Build complete!'
"@
Write-Host "✓ Applications built`n" -ForegroundColor Green

# Deploy with PM2
Write-Host "[5/6] Starting services with PM2..." -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP @"
cd /var/www/sak-erp

# Stop existing processes
pm2 stop all || true
pm2 delete all || true

# Start API
cd apps/api
pm2 start dist/main.js --name sak-api --time
cd ../..

# Start Web
cd apps/web
pm2 start 'pnpm start' --name sak-web --time
cd ..

# Save PM2 processes
pm2 save
pm2 startup | grep -v 'sudo env' | grep 'sudo' | bash || true

echo 'Services started!'
pm2 status
"@
Write-Host "✓ Services started`n" -ForegroundColor Green

# Configure Nginx
Write-Host "[6/6] Configuring Nginx..." -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP @"
if ! command -v nginx &> /dev/null; then
    echo 'Installing Nginx...'
    echo '$SUDO_PASSWORD' | sudo -S apt-get update
    echo '$SUDO_PASSWORD' | sudo -S apt-get install -y nginx
fi

# Create Nginx config
echo '$SUDO_PASSWORD' | sudo -S tee /etc/nginx/sites-available/sak-erp > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name 72.62.192.228;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 50M;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        client_max_body_size 50M;
    }
}
NGINXEOF

# Enable site
echo '$SUDO_PASSWORD' | sudo -S ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
echo '$SUDO_PASSWORD' | sudo -S rm -f /etc/nginx/sites-enabled/default

# Test and reload
echo '$SUDO_PASSWORD' | sudo -S nginx -t
echo '$SUDO_PASSWORD' | sudo -S systemctl restart nginx

echo 'Nginx configured!'
"@
Write-Host "✓ Nginx configured`n" -ForegroundColor Green

# Show final status
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Your application is now live at:" -ForegroundColor Yellow
Write-Host "  Frontend: http://72.62.192.228" -ForegroundColor White
Write-Host "  API:      http://72.62.192.228/api/v1`n" -ForegroundColor White

Write-Host "PM2 Status:" -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP "pm2 status"

Write-Host "`nTo view logs:" -ForegroundColor Yellow
Write-Host "  ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP 'pm2 logs'" -ForegroundColor Gray
Write-Host "`nTo restart services:" -ForegroundColor Yellow
Write-Host "  ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP 'pm2 restart all'" -ForegroundColor Gray
Write-Host ""
