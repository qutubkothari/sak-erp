# ============================================================================
# SAK ERP - Automated Deployment Script (Windows PowerShell)
# ============================================================================

param(
    [switch]$WebOnly,
    [switch]$ApiOnly,
    [switch]$Full,
    [switch]$Yes
)

$SERVER = "ubuntu@13.205.17.214"
$SSH_KEY = "saif-erp.pem"  # Update path if needed
$APP_DIR = "/home/ubuntu/sak-erp"

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResolvedSshKey = $null
if (Test-Path $SSH_KEY) {
    $ResolvedSshKey = (Resolve-Path $SSH_KEY).Path
} elseif (Test-Path (Join-Path $ScriptDir $SSH_KEY)) {
    $ResolvedSshKey = (Resolve-Path (Join-Path $ScriptDir $SSH_KEY)).Path
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SAK ERP - Automated Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Function to execute SSH commands
function Escape-BashSingleQuotes {
    param([string]$Text)
    # Wrap remote command in single quotes; escape embedded single quotes for bash.
    $replacement = "'" + "\" + "'" + "'"
    return ($Text -replace "'", $replacement)
}

function Invoke-SSHCommand {
    param([string]$Command)

    $escaped = Escape-BashSingleQuotes $Command
    $remote = "bash -lc 'set -euo pipefail; $escaped'"

    if ($ResolvedSshKey) {
        ssh -i $ResolvedSshKey $SERVER $remote
    } else {
        Write-Host "NOTE: SSH key '$SSH_KEY' not found locally; using default ssh auth." -ForegroundColor Yellow
        ssh $SERVER $remote
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Remote command failed (exit $LASTEXITCODE): $Command"
    }
}

# Check git status
Write-Host "Checking git status..." -ForegroundColor Yellow
git status --short

if (-not $Yes) {
    Write-Host ""
    $continue = Read-Host "Continue with deployment? (y/n)"
    if ($continue -ne "y") {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit
    }
} else {
    Write-Host ""
    Write-Host "Auto-confirm enabled (-Yes)" -ForegroundColor Green
}

# Preflight remote diagnostics
Write-Host "" 
Write-Host "Remote preflight..." -ForegroundColor Yellow
Invoke-SSHCommand "echo 'Connected OK'; whoami; hostname; echo 'PWD:'; pwd; echo 'Home:'; ls -la ~; echo 'App dir:'; ls -la '$APP_DIR' || true; if [ -d '$APP_DIR/.git' ]; then echo 'Repo check:'; cd '$APP_DIR' && git rev-parse --is-inside-work-tree && git rev-parse --short HEAD; else echo 'Repo not found at APP_DIR'; ls -la /home/ubuntu; fi"

# Deploy Frontend
if ($WebOnly -or $Full -or (-not $ApiOnly)) {
    Write-Host ""
    Write-Host "Deploying Frontend..." -ForegroundColor Green
    Write-Host "  - Pulling latest code..." -ForegroundColor Gray
    Invoke-SSHCommand ("cd '$APP_DIR' && git pull origin production-clean")
    
    Write-Host "  - Restarting web service..." -ForegroundColor Gray
    Invoke-SSHCommand "pm2 restart sak-web"
    
    Write-Host "  Frontend deployed!" -ForegroundColor Green
}

# Deploy API
if ($ApiOnly -or $Full) {
    Write-Host ""
    Write-Host "Deploying API..." -ForegroundColor Green
    Write-Host "  - Pulling latest code..." -ForegroundColor Gray
    Invoke-SSHCommand ("cd '$APP_DIR' && git pull origin production-clean")
    
    Write-Host "  - Installing dependencies..." -ForegroundColor Gray
    Invoke-SSHCommand ("cd '$APP_DIR/apps/api' && npm install")
    
    Write-Host "  - Building API..." -ForegroundColor Gray
    Invoke-SSHCommand ("cd '$APP_DIR/apps/api' && npm run build")
    
    Write-Host "  - Restarting API service..." -ForegroundColor Gray
    Invoke-SSHCommand "pm2 restart sak-api"
    
    Write-Host "  API deployed!" -ForegroundColor Green
}

# Show status
Write-Host ""
Write-Host "Current PM2 Status:" -ForegroundColor Cyan
Invoke-SSHCommand "pm2 list"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Application URLs:" -ForegroundColor Yellow
Write-Host "  - Frontend: http://13.205.17.214:3000"
Write-Host "  - API: http://13.205.17.214:4000"
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  pm2 logs sak-web --lines 50"
Write-Host "  pm2 logs sak-api --lines 50"
Write-Host ""
