#!/usr/bin/env pwsh
# Production Deployment Script
# This script deploys the latest code to the production server

Write-Host "`n=== Manufacturing ERP - Production Deployment ===" -ForegroundColor Cyan
Write-Host "Starting deployment process...`n" -ForegroundColor Green

# Check if we have uncommitted changes
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "WARNING: You have uncommitted changes!" -ForegroundColor Yellow
    Write-Host $gitStatus
    $continue = Read-Host "`nContinue with deployment anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "Deployment cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Current branch: " -NoNewline
git branch --show-current

Write-Host "`nLatest commit:" -ForegroundColor Cyan
git log -1 --oneline

Write-Host "`n--- Connecting to Production Server ---" -ForegroundColor Yellow
Write-Host "Server: 13.205.17.214" -ForegroundColor Gray

# SSH and deploy
# Note: Make sure your SSH key is configured properly
ssh ubuntu@13.205.17.214 "
    set -e
    cd ~/manufacturing_erp
    
    echo 'Pulling latest code from production-clean branch...'
    git pull origin production-clean
    
    echo ''
    echo 'Installing dependencies...'
    npm install
    
    echo ''
    echo 'Building application...'
    npm run build
    
    echo ''
    echo 'Restarting API service...'
    pm2 restart api
    
    echo ''
    echo 'Deployment complete!'
    echo ''
    echo 'Current PM2 Status:'
    pm2 status
    
    echo ''
    echo 'Latest Git Commit:'
    git log -1 --oneline
"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment Successful!" -ForegroundColor Green
    Write-Host "API is running at: http://13.205.17.214:4000" -ForegroundColor Cyan
    Write-Host "Web is running at: http://13.205.17.214:3000" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Deployment Failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Yellow
    exit 1
}
