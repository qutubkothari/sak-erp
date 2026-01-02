# Manual EC2 Deploy Script - Run this in your PowerShell
# Shows progress at each step

$ErrorActionPreference = "Stop"
$key = ".\saif-erp.pem"
$host_ip = "3.110.100.60"  # Update if EC2 public IP changes

Write-Host "`n=== EC2 Manual Deployment ===" -ForegroundColor Cyan
Write-Host "IP: $host_ip" -ForegroundColor Gray
Write-Host "Key: $key`n" -ForegroundColor Gray

# Step 1: Check EC2 Resources
Write-Host "Step 1: Checking EC2 disk and memory..." -ForegroundColor Yellow
ssh -o ConnectTimeout=10 -i $key ubuntu@$host_ip "df -h /; echo '---'; free -h"

# Step 2: Check PM2 Status
Write-Host "`nStep 2: Checking PM2 status..." -ForegroundColor Yellow
ssh -o ConnectTimeout=10 -i $key ubuntu@$host_ip "cd ~/sak-erp; pm2 list"

# Step 3: Pull Latest Code
Write-Host "`nStep 3: Pulling latest code..." -ForegroundColor Yellow
ssh -o ConnectTimeout=10 -i $key ubuntu@$host_ip "cd ~/sak-erp; git status -sb; git pull"

# Step 4: Clean Build (optional - uncomment if needed)
# Write-Host "`nStep 4: Cleaning old builds..." -ForegroundColor Yellow
# ssh -o ConnectTimeout=10 -i $key ubuntu@$host_ip "cd ~/sak-erp; rm -rf apps/web/.next apps/api/dist"

# Step 5: Install Dependencies (THIS TAKES TIME - 2-5 minutes)
Write-Host "`nStep 5: Installing dependencies (this takes 2-5 mins)..." -ForegroundColor Yellow
Write-Host ">> If this hangs, press Ctrl+C and check EC2 disk space" -ForegroundColor Red
ssh -o ConnectTimeout=30 -i $key ubuntu@$host_ip "cd ~/sak-erp; pnpm install --frozen-lockfile"

# Step 6: Build (THIS TAKES TIME - 2-5 minutes)
Write-Host "`nStep 6: Building application (this takes 2-5 mins)..." -ForegroundColor Yellow
ssh -o ConnectTimeout=30 -i $key ubuntu@$host_ip "cd ~/sak-erp; pnpm build"

# Step 7: Restart PM2
Write-Host "`nStep 7: Restarting PM2 processes..." -ForegroundColor Yellow
ssh -o ConnectTimeout=10 -i $key ubuntu@$host_ip "cd ~/sak-erp; pm2 restart sak-api; pm2 restart sak-web; pm2 save; pm2 list"

# Step 8: Verify
Write-Host "`nStep 8: Verifying deployment..." -ForegroundColor Yellow
ssh -o ConnectTimeout=10 -i $key ubuntu@$host_ip "curl -fsSI http://127.0.0.1:3000/ | head -n 3; curl -fsSI http://127.0.0.1:4000/ | head -n 3"

Write-Host "`n=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host "Frontend: http://$host_ip:3000" -ForegroundColor Cyan
Write-Host "API: http://$host_ip:4000" -ForegroundColor Cyan
Write-Host "HR Module: http://$host_ip:3000/dashboard/hr" -ForegroundColor Cyan
