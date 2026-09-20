#!/bin/bash
# Hostinger VPS Setup - Run this on your VPS
# SSH: ssh qutubk@72.62.192.228
# Password: 3998
# Sudo Password: 515253

echo "=========================================="
echo "Starting Hostinger VPS Setup"
echo "=========================================="

# Install Node.js
echo "Installing Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
echo "Node.js: $(node -v)"

# Install pnpm
echo "Installing pnpm..."
sudo npm install -g pnpm
echo "pnpm: $(pnpm -v)"

# Install PM2
echo "Installing PM2..."
sudo npm install -g pm2
echo "PM2: $(pm2 -v)"

# Create deployment directory
echo "Creating deployment directory..."
sudo mkdir -p /var/www/sak-erp
sudo chown -R qutubk:qutubk /var/www/sak-erp
echo "Directory: /var/www/sak-erp"

# Install Nginx
echo "Installing Nginx..."
sudo apt install -y nginx

# Configure Nginx
echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/sak-erp > /dev/null <<'EOF'
server {
    listen 80;
    server_name 72.62.192.228;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        client_max_body_size 50M;
    }
}
EOF

# Enable site
echo "Enabling site..."
sudo ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create .env directory
mkdir -p /var/www/sak-erp/apps/api

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo "Node.js: $(node -v)"
echo "pnpm: $(pnpm -v)"
echo "PM2: $(pm2 -v)"
echo "Nginx: Running"
echo ""
echo "Now run deployment from Windows:"
echo ".\deploy-hostinger.ps1"
echo "=========================================="
