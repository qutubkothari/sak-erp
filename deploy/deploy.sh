#!/bin/bash
# Deployment Script for SAK Solutions ERP
# Run this from the project root on EC2

set -e

echo "========================================"
echo "SAK Solutions ERP - Deployment"
echo "========================================"

APP_DIR="/var/www/sak-erp"
cd $APP_DIR

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
cd packages/database
pnpm prisma generate
cd ../..

# Build applications
echo "🏗️  Building applications..."
pnpm build

# Run database migrations
echo "🗄️  Running database migrations..."
cd packages/database
pnpm prisma migrate deploy
cd ../..

# Restart PM2 processes
echo "🔄 Restarting applications..."

# Stop existing processes (if any)
pm2 delete sak-erp-api || true
pm2 delete sak-erp-web || true

# Start API
cd apps/api
pm2 start npm --name "sak-erp-api" -- start
cd ../..

# Start Frontend
cd apps/web
pm2 start npm --name "sak-erp-web" -- start
cd ../..

# Save PM2 process list
pm2 save

# Show status
pm2 status

echo "✅ Deployment Complete!"
echo ""
echo "API running on: http://localhost:4000"
echo "Web running on: http://localhost:3000"
echo ""
echo "View logs:"
echo "  pm2 logs sak-erp-api"
echo "  pm2 logs sak-erp-web"
