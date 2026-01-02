# Quick EC2 Deployment - PowerShell Script

# Configuration - UPDATE THESE
$EC2_IP = "your-ec2-ip-address"
$EC2_USER = "ubuntu"
$KEY_PATH = "path\to\your-key.pem"

Write-Host "🚀 Manufacturing ERP - EC2 Deployment" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if build exists
if (-not (Test-Path "apps\web\.next")) {
    Write-Host "❌ Web build not found! Building..." -ForegroundColor Red
    pnpm -C apps/web build
}

if (-not (Test-Path "apps\api\dist")) {
    Write-Host "❌ API build not found! Building..." -ForegroundColor Red
    pnpm -C apps/api build
}

Write-Host "✓ Builds found" -ForegroundColor Green

# Step 2: Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

$files = @(
    "apps\web\.next\*",
    "apps\web\package.json",
    "apps\web\next.config.js",
    "apps\api\dist\*",
    "apps\api\package.json",
    "packages\hr-module\dist\*",
    "packages\hr-module\package.json",
    "package.json",
    "pnpm-workspace.yaml"
)

# Create temp directory
$tempDir = "deploy-temp"
Remove-Item -Path $tempDir -Recurse -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files
Copy-Item -Path "apps\web\.next" -Destination "$tempDir\apps\web\.next" -Recurse -Force
Copy-Item -Path "apps\web\package.json" -Destination "$tempDir\apps\web\" -Force
Copy-Item -Path "apps\web\next.config.js" -Destination "$tempDir\apps\web\" -Force
Copy-Item -Path "apps\api\dist" -Destination "$tempDir\apps\api\dist" -Recurse -Force
Copy-Item -Path "apps\api\package.json" -Destination "$tempDir\apps\api\" -Force
Copy-Item -Path "packages\hr-module\dist" -Destination "$tempDir\packages\hr-module\dist" -Recurse -Force
Copy-Item -Path "packages\hr-module\package.json" -Destination "$tempDir\packages\hr-module\" -Force
Copy-Item -Path "package.json" -Destination "$tempDir\" -Force
Copy-Item -Path "pnpm-workspace.yaml" -Destination "$tempDir\" -Force

# Create tar.gz
tar -czf deploy-package.tar.gz -C $tempDir .
Remove-Item -Path $tempDir -Recurse -Force

$size = [math]::Round((Get-Item deploy-package.tar.gz).Length / 1MB, 2)
Write-Host "✓ Package created: deploy-package.tar.gz ($size MB)" -ForegroundColor Green

# Step 3: Upload to EC2
Write-Host ""
Write-Host "📤 Uploading to EC2..." -ForegroundColor Yellow
Write-Host "   Run this command:" -ForegroundColor Cyan
Write-Host "   scp -i $KEY_PATH deploy-package.tar.gz $EC2_USER@${EC2_IP}:/tmp/" -ForegroundColor White

# Step 4: Deployment instructions
Write-Host ""
Write-Host "🔧 On your EC2 instance, run these commands:" -ForegroundColor Yellow
Write-Host ""
Write-Host "ssh -i $KEY_PATH $EC2_USER@$EC2_IP" -ForegroundColor White
Write-Host ""
Write-Host "# On EC2:" -ForegroundColor Gray
Write-Host "mkdir -p ~/sak-erp" -ForegroundColor White
Write-Host "cd ~/sak-erp" -ForegroundColor White
Write-Host "tar -xzf /tmp/deploy-package.tar.gz" -ForegroundColor White
Write-Host "pnpm install --prod" -ForegroundColor White
Write-Host ""
Write-Host "# Start API" -ForegroundColor Gray
Write-Host "cd ~/sak-erp/apps/api" -ForegroundColor White
Write-Host "pm2 delete sak-api 2>/dev/null || true" -ForegroundColor White
Write-Host "pm2 start npm --name 'sak-api' -- run start:prod" -ForegroundColor White
Write-Host ""
Write-Host "# Start Web" -ForegroundColor Gray
Write-Host "cd ~/sak-erp/apps/web" -ForegroundColor White
Write-Host "pm2 delete sak-web 2>/dev/null || true" -ForegroundColor White
Write-Host "pm2 start npm --name 'sak-web' -- start" -ForegroundColor White
Write-Host ""
Write-Host "# Save PM2 config" -ForegroundColor Gray
Write-Host "pm2 save" -ForegroundColor White
Write-Host "pm2 list" -ForegroundColor White
Write-Host ""
Write-Host "✅ Deployment package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Access URLs:" -ForegroundColor Cyan
Write-Host "   Web: http://${EC2_IP}:3000" -ForegroundColor White
Write-Host "   API: http://${EC2_IP}:4000/api/v1" -ForegroundColor White
Write-Host "   HR:  http://${EC2_IP}:3000/dashboard/hr" -ForegroundColor White
