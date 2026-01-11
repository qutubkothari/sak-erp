#!/bin/bash
# Deployment script for pms.saksolution.com
# Run this on your production server after pushing code to GitHub

echo "=== DEPLOYING SAK-ERP TO PRODUCTION ==="
echo ""

# Navigate to project directory (adjust path as needed)
cd /path/to/sak-erp || exit 1

echo "1. Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "2. Deploying API (NestJS)..."
cd apps/api || exit 1
pnpm install
pnpm build
pm2 restart sak-erp-api || pm2 start dist/main.js --name sak-erp-api

echo ""
echo "3. Deploying Web (Next.js)..."
cd ../web || exit 1
pnpm install
pnpm build
pm2 restart sak-erp-web || pm2 start npm --name sak-erp-web -- start

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Check status: pm2 status"
echo "Check logs: pm2 logs sak-erp-api"
echo "           pm2 logs sak-erp-web"
