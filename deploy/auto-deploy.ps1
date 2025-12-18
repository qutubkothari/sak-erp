# ============================================================================
# SAK ERP - Automated Deployment Script (Windows PowerShell)
# ============================================================================

param(
    [switch]$WebOnly,
    [switch]$ApiOnly,
    [switch]$Full
)

$SERVER = "ubuntu@13.205.17.214"
$SSH_KEY = "saif-erp.pem"  # Update path if needed
$APP_DIR = "/home/ubuntu/sak-erp"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SAK ERP - Automated Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to execute SSH commands
function Invoke-SSHCommand {
    param([string]$Command)
    
    if (Test-Path $SSH_KEY) {
        ssh -i $SSH_KEY $SERVER "bash -c `"$Command`""
    } else {
        # Try without key (if key is in default location or ssh-agent)
        ssh $SERVER "bash -c `"$Command`""
    }
}

# Check git status
Write-Host "📋 Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
$continue = Read-Host "Continue with deployment? (y/n)"
if ($continue -ne "y") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit
}

# Deploy Frontend
if ($WebOnly -or $Full -or (-not $ApiOnly)) {
    Write-Host ""
    Write-Host "🌐 Deploying Frontend..." -ForegroundColor Green
    Write-Host "  • Pulling latest code..." -ForegroundColor Gray
    Invoke-SSHCommand ('cd ' + $APP_DIR + ' && git pull origin production-clean')
    
    Write-Host "  • Restarting web service..." -ForegroundColor Gray
    Invoke-SSHCommand "pm2 restart sak-web"
    
    Write-Host "  ✅ Frontend deployed!" -ForegroundColor Green
}

# Deploy API
if ($ApiOnly -or $Full) {
    Write-Host ""
    Write-Host "🔧 Deploying API..." -ForegroundColor Green
    Write-Host "  • Pulling latest code..." -ForegroundColor Gray
    Invoke-SSHCommand ('cd ' + $APP_DIR + ' && git pull origin production-clean')
    
    Write-Host "  • Installing dependencies..." -ForegroundColor Gray
    Invoke-SSHCommand ('cd ' + $APP_DIR + '/apps/api && npm install')
    
    Write-Host "  • Building API..." -ForegroundColor Gray
    Invoke-SSHCommand ('cd ' + $APP_DIR + '/apps/api && npm run build')
    
    Write-Host "  • Restarting API service..." -ForegroundColor Gray
    Invoke-SSHCommand "pm2 restart sak-api"
    
    Write-Host "  ✅ API deployed!" -ForegroundColor Green
}

# Show status
Write-Host ""
Write-Host "📊 Current PM2 Status:" -ForegroundColor Cyan
Invoke-SSHCommand "pm2 list"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  ✅ Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌍 Application URLs:" -ForegroundColor Yellow
Write-Host "  • Frontend: http://13.205.17.214:3000"
Write-Host "  • API: http://13.205.17.214:4000"
Write-Host ""
Write-Host "📝 View logs:" -ForegroundColor Yellow
Write-Host "  pm2 logs sak-web --lines 50"
Write-Host "  pm2 logs sak-api --lines 50"
Write-Host ""
