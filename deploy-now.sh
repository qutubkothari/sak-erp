#!/bin/bash

# Manufacturing ERP - Quick EC2 Deployment Script
# Deploys to 3.110.100.60

set -e

EC2_HOST="3.110.100.60"
EC2_USER="ubuntu"
EC2_KEY="saif-erp.pem"
DEPLOY_PATH="/home/ubuntu/sak-erp"

echo "🚀 Manufacturing ERP - Deploying to EC2..."

# Build locally
echo "📦 Building API..."
cd apps/api
pnpm install
pnpm build

echo "📦 Building Web..."
cd ../web
pnpm install
pnpm build

cd ../..

# Create deployment package
echo "📁 Creating deployment package..."
tar -czf deploy.tar.gz \
  apps/web/.next \
  apps/web/package.json \
  apps/web/next.config.js \
  apps/web/public \
  apps/api/dist \
  apps/api/package.json \
  apps/api/tsconfig.json \
  package.json \
  pnpm-workspace.yaml

echo "✓ Package created: deploy.tar.gz"

# Upload to EC2
echo "📤 Uploading to EC2..."
scp -i "$EC2_KEY" -o StrictHostKeyChecking=no deploy.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

echo "🔧 Deploying on EC2..."
ssh -i "$EC2_KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" << 'ENDSSH'
set -e

# Setup directory
cd /home/ubuntu
if [ ! -d "sak-erp" ]; then
  mkdir -p sak-erp
fi
cd sak-erp

# Backup
if [ -d "apps" ]; then
  echo "📦 Backing up..."
  tar -czf "backup-$(date +%Y%m%d-%H%M%S).tar.gz" apps 2>/dev/null || true
fi

# Extract
echo "📂 Extracting..."
tar -xzf /tmp/deploy.tar.gz
rm /tmp/deploy.tar.gz

# Install production dependencies
echo "📥 Installing dependencies..."
pnpm install --prod --frozen-lockfile || npm install --production

# Restart services
echo "🔄 Restarting services..."
pm2 delete sak-api 2>/dev/null || true
pm2 delete sak-web 2>/dev/null || true

# Start API
cd /home/ubuntu/sak-erp/apps/api
pm2 start dist/main.js --name "sak-api" -i 1

# Start Web
cd /home/ubuntu/sak-erp/apps/web
pm2 start npm --name "sak-web" -- start

# Save PM2 config
pm2 save

echo "✅ Deployment complete!"
pm2 list
ENDSSH

# Cleanup local
rm deploy.tar.gz

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📊 Check status:"
echo "  ssh -i $EC2_KEY $EC2_USER@$EC2_HOST"
echo "  pm2 list"
echo "  pm2 logs sak-api"
echo "  pm2 logs sak-web"
