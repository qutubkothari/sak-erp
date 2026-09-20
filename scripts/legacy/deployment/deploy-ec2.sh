#!/bin/bash

# Manufacturing ERP - EC2 Deployment Script
# This script builds and deploys the application to EC2

set -e

echo "🚀 Starting EC2 Deployment..."

# Configuration - UPDATE THESE VALUES
EC2_HOST="your-ec2-instance.compute.amazonaws.com"
EC2_USER="ubuntu"
EC2_KEY_PATH="./your-key.pem"
DEPLOY_PATH="/home/ubuntu/sak-erp"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build the application
echo -e "${BLUE}📦 Building application...${NC}"
pnpm install
pnpm -C apps/api build
pnpm -C apps/web build

# Step 2: Create deployment package
echo -e "${BLUE}📁 Creating deployment package...${NC}"
tar -czf deploy.tar.gz \
  apps/web/.next \
  apps/web/package.json \
  apps/web/next.config.js \
  apps/web/public \
  apps/api/dist \
  apps/api/package.json \
  packages/hr-module/dist \
  packages/hr-module/package.json \
  package.json \
  pnpm-workspace.yaml \
  pnpm-lock.yaml

echo -e "${GREEN}✓ Deployment package created (deploy.tar.gz)${NC}"

# Step 3: Upload to EC2
echo -e "${BLUE}📤 Uploading to EC2...${NC}"
scp -i "$EC2_KEY_PATH" deploy.tar.gz "$EC2_USER@$EC2_HOST:/tmp/"

# Step 4: Deploy on EC2
echo -e "${BLUE}🔧 Deploying on EC2...${NC}"
ssh -i "$EC2_KEY_PATH" "$EC2_USER@$EC2_HOST" << 'ENDSSH'
  set -e
  
  # Create deployment directory
  mkdir -p /home/ubuntu/sak-erp
  cd /home/ubuntu/sak-erp
  
  # Backup existing deployment
  if [ -d "apps" ]; then
    echo "📦 Backing up existing deployment..."
    tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz apps packages 2>/dev/null || true
  fi
  
  # Extract new deployment
  echo "📂 Extracting deployment package..."
  tar -xzf /tmp/deploy.tar.gz
  rm /tmp/deploy.tar.gz
  
  # Install dependencies (production only)
  echo "📥 Installing production dependencies..."
  pnpm install --prod --frozen-lockfile
  
  # Setup PM2 if not installed
  if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
  fi
  
  # Stop existing processes
  echo "🛑 Stopping existing processes..."
  pm2 delete sak-api 2>/dev/null || true
  pm2 delete sak-web 2>/dev/null || true
  
  # Start API server
  echo "🚀 Starting API server..."
  cd /home/ubuntu/sak-erp/apps/api
  pm2 start npm --name "sak-api" -- run start:prod
  
  # Start Web server
  echo "🌐 Starting Web server..."
  cd /home/ubuntu/sak-erp/apps/web
  pm2 start npm --name "sak-web" -- start
  
  # Save PM2 configuration
  pm2 save
  pm2 startup
  
  echo "✅ Deployment complete!"
  echo "📊 Server status:"
  pm2 list
ENDSSH

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${BLUE}🌐 Application URLs:${NC}"
echo -e "   API:  http://$EC2_HOST:4000/api/v1"
echo -e "   Web:  http://$EC2_HOST:3000"
echo ""
echo -e "${BLUE}📋 Useful commands:${NC}"
echo -e "   Check status: ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 list'"
echo -e "   View logs:    ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 logs'"
echo -e "   Restart:      ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST 'pm2 restart all'"

# Cleanup
rm deploy.tar.gz
