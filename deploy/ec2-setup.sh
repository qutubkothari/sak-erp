#!/bin/bash
# EC2 Setup Script for SAK Solutions ERP
# Run this on a fresh Ubuntu 22.04 EC2 instance

set -e  # Exit on any error

echo "========================================"
echo "SAK Solutions ERP - EC2 Setup"
echo "========================================"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
echo "📦 Installing pnpm..."
sudo npm install -g pnpm

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install Git
echo "📦 Installing Git..."
sudo apt-get install -y git

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/sak-erp
sudo chown -R $USER:$USER /var/www/sak-erp

# Setup environment file
echo "📝 Creating environment template..."
cat > /var/www/sak-erp/.env.example << 'EOF'
# Database (Supabase)
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"

# JWT Secrets (CHANGE THESE!)
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this"

# Application
NODE_ENV="production"
PORT=4000
FRONTEND_URL="http://15.206.164.166"

# Redis (Upstash or local)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# RabbitMQ (CloudAMQP or local)
RABBITMQ_URL="amqp://localhost:5672"

# Email (Optional - for password reset)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""
EOF

# Setup PM2 startup
echo "🚀 Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

echo "✅ EC2 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/sak-erp"
echo "2. Copy .env.example to .env and configure"
echo "3. Run the deployment script: ./deploy.sh"
