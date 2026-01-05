#!/bin/bash
# Hostinger VPS Setup Script
# Run this on the Hostinger VPS to prepare for deployment

set -e

echo "=========================================="
echo "Hostinger VPS Setup for SAK ERP"
echo "=========================================="

# Update system
echo "Updating system packages..."
sudo apt update

# Install Node.js v20
echo "Installing Node.js v20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi

echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# Install pnpm
echo "Installing pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm
fi
echo "pnpm version: $(pnpm -v)"

# Install PM2
echo "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
echo "PM2 version: $(pm2 -v)"

# Setup PM2 startup
echo "Configuring PM2 to start on boot..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER

# Create deployment directory
echo "Creating deployment directory..."
sudo mkdir -p /var/www/sak-erp
sudo chown -R $USER:$USER /var/www/sak-erp
echo "Deployment directory created: /var/www/sak-erp"

# Install Nginx
echo "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi
echo "Nginx version: $(nginx -v 2>&1)"

# Create Nginx configuration
echo "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/sak-erp > /dev/null <<'EOF'
server {
    listen 80;
    server_name 72.62.192.228;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # API (NestJS)
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
EOF

# Enable site
echo "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Start and enable Nginx
echo "Starting Nginx..."
sudo systemctl enable nginx
sudo systemctl restart nginx

# Configure firewall (if ufw is active)
if sudo ufw status | grep -q "Status: active"; then
    echo "Configuring firewall..."
    sudo ufw allow 22
    sudo ufw allow 80
    sudo ufw allow 443
fi

# Create .env file template
echo "Creating .env template..."
mkdir -p /var/www/sak-erp/apps/api
cat > /var/www/sak-erp/apps/api/.env <<'EOF'
# Database Configuration
DATABASE_URL="your_supabase_connection_string"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_KEY="your_service_key"

# JWT Configuration
JWT_SECRET="your_jwt_secret"

# Server Configuration
PORT=4000
NODE_ENV=production
EOF

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "✅ Node.js: $(node -v)"
echo "✅ pnpm: $(pnpm -v)"
echo "✅ PM2: $(pm2 -v)"
echo "✅ Nginx: Configured and running"
echo "✅ Deployment directory: /var/www/sak-erp"
echo ""
echo "⚠️  IMPORTANT: Update environment variables"
echo "   Edit: /var/www/sak-erp/apps/api/.env"
echo ""
echo "Next step: Run deployment from Windows"
echo "   .\deploy-hostinger.ps1"
echo ""
