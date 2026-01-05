#!/bin/bash
# Hostinger VPS Complete Setup Script
# Run this ONCE on your Hostinger VPS to prepare for deployments
# 
# How to use:
# 1. SSH to VPS: ssh qutubk@72.62.192.228 (password: 3998)
# 2. Run: curl -sSL https://raw.githubusercontent.com/qutubkothari/sak-erp/main/hostinger-one-time-setup.sh | bash
# OR manually: wget https://raw.githubusercontent.com/qutubkothari/sak-erp/main/hostinger-one-time-setup.sh && chmod +x hostinger-one-time-setup.sh && ./hostinger-one-time-setup.sh

set -e

echo "=========================================="
echo "Hostinger VPS Setup for SAK ERP"
echo "=========================================="
echo ""
echo "This script will install:"
echo "  - Node.js v20"
echo "  - pnpm"
echo "  - PM2"
echo "  - Nginx"
echo "  - Configure reverse proxy"
echo ""
echo "You will be prompted for sudo password: 515253"
echo ""
read -p "Press Enter to continue..."

# Update system
echo ""
echo ">>> Updating system packages..."
sudo apt update

# Install Node.js v20
echo ""
echo ">>> Installing Node.js v20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
else
    echo "Node.js already installed"
fi
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"

# Install pnpm
echo ""
echo ">>> Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm
else
    echo "pnpm already installed"
fi
echo "pnpm: $(pnpm -v)"

# Install PM2
echo ""
echo ">>> Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "PM2 already installed"
fi
echo "PM2: $(pm2 -v)"

# Setup PM2 startup
echo ""
echo ">>> Configuring PM2 to start on boot..."
pm2 startup systemd -u qutubk --hp /home/qutubk | grep "sudo" | bash || true

# Create deployment directory
echo ""
echo ">>> Creating deployment directory..."
sudo mkdir -p /var/www/sak-erp
sudo chown -R qutubk:qutubk /var/www/sak-erp
echo "Created: /var/www/sak-erp"

# Install Nginx
echo ""
echo ">>> Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
else
    echo "Nginx already installed"
fi
echo "Nginx: $(nginx -v 2>&1)"

# Configure Nginx
echo ""
echo ">>> Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/sak-erp > /dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 72.62.192.228 _;

    client_max_body_size 50M;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API (NestJS)
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site and disable default
echo ""
echo ">>> Enabling site..."
sudo ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo ""
echo ">>> Testing Nginx configuration..."
sudo nginx -t

# Restart Nginx
echo ""
echo ">>> Restarting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Create .env template
echo ""
echo ">>> Creating environment template..."
mkdir -p /var/www/sak-erp/apps/api
cat > /var/www/sak-erp/apps/api/.env <<'ENVEOF'
# Supabase Configuration (from EC2)
DATABASE_URL="postgresql://postgres.wqjfvvkucmqvbtaekjlk:3216549870@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
SUPABASE_URL="https://wqjfvvkucmqvbtaekjlk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmt1Y21xdmJ0YWVramxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzMzA2NjcsImV4cCI6MjA0OTkwNjY2N30.FO3PvP4wE8-09KjqIlgmS03_mqj8h_uQD1y2-y9GXbk"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmt1Y21xdmJ0YWVramxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDMzMDY2NywiZXhwIjoyMDQ5OTA2NjY3fQ.6FUxpZ7oZL5WBFGBvkrJx5nYIVx_lnCY0RSl1w6s2pI"

# JWT Configuration
JWT_SECRET="sak-erp-jwt-secret-2024"

# Server Configuration
PORT=4000
NODE_ENV=production
ENVEOF

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Installed Software:"
echo "  Node.js: $(node -v)"
echo "  pnpm: $(pnpm -v)"
echo "  PM2: $(pm2 -v)"
echo "  Nginx: $(nginx -v 2>&1)"
echo ""
echo "Configuration:"
echo "  Deployment directory: /var/www/sak-erp"
echo "  Nginx config: /etc/nginx/sites-available/sak-erp"
echo "  Environment: /var/www/sak-erp/apps/api/.env"
echo ""
echo "Next Steps:"
echo "  1. Type 'exit' to close this SSH session"
echo "  2. On Windows, run: .\deploy-hostinger.ps1"
echo "  3. Access your app: http://72.62.192.228"
echo ""
echo "=========================================="
