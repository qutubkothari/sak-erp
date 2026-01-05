# Automated Hostinger Deployment
$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$SSH_KEY = "$env:USERPROFILE\.ssh\hostinger_ed25519"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SAK ERP - Automated Hostinger Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "[1/4] Testing SSH connection..." -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP "echo Connected"
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR" -ForegroundColor Red; exit 1 }
Write-Host "OK`n" -ForegroundColor Green

Write-Host "[2/4] Downloading deployment script..." -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP 'curl -fsSL https://raw.githubusercontent.com/qutubkothari/sak-erp/main/deploy-from-github.sh -o /tmp/deploy.sh; chmod +x /tmp/deploy.sh'
Write-Host "OK`n" -ForegroundColor Green

Write-Host "[3/4] Running deployment (5-10 minutes)...`n" -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP "bash /tmp/deploy.sh"

Write-Host "`n[4/4] Checking status..." -ForegroundColor Yellow
ssh -i $SSH_KEY $HOSTINGER_USER@$HOSTINGER_IP "pm2 status"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DONE! Visit: http://72.62.192.228" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
