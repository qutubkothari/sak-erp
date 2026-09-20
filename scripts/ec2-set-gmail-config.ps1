# PowerShell script to securely configure Gmail SMTP settings on EC2
# This script updates the .env file with Gmail configuration for erpsak53@gmail.com

param(
    [string]$KeyFile = "C:\Users\musta\Documents\Keys\saif-erp.pem",
    [string]$Host = "ubuntu@3.110.100.60"
)

Write-Host "=== Gmail SMTP Configuration for EC2 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will configure Gmail SMTP for: erpsak53@gmail.com" -ForegroundColor Yellow
Write-Host ""
Write-Host "You will need:" -ForegroundColor White
Write-Host "  1. Gmail App Password (NOT your regular Gmail password)" -ForegroundColor White
Write-Host "     Generate at: https://myaccount.google.com/apppasswords" -ForegroundColor Gray
Write-Host ""

# Prompt for Gmail App Password securely
$securePass = Read-Host "Enter Gmail App Password (will be hidden)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePass)
$gmailPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

if ([string]::IsNullOrWhiteSpace($gmailPassword)) {
    Write-Host "ERROR: Gmail password cannot be empty" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating Gmail configuration file..." -ForegroundColor Cyan

# Create a temporary env file with Gmail settings
$envContent = @"
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=erpsak53@gmail.com
SMTP_PASS=$gmailPassword
SMTP_FROM=erpsak53@gmail.com

# Email Addresses - All using erpsak53@gmail.com
DEFAULT_EMAIL=erpsak53@gmail.com
EMAIL_ADMIN=erpsak53@gmail.com
EMAIL_SALES=erpsak53@gmail.com
EMAIL_SUPPORT=erpsak53@gmail.com
EMAIL_TECHNICAL=erpsak53@gmail.com
EMAIL_PURCHASE=erpsak53@gmail.com
EMAIL_HR=erpsak53@gmail.com
EMAIL_NOREPLY=erpsak53@gmail.com
"@

# Save to temporary file
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $envContent -NoNewline

Write-Host "Uploading Gmail configuration to EC2..." -ForegroundColor Cyan

# Upload to EC2 /tmp directory
& scp -i $KeyFile $tempFile "${Host}:/tmp/sak-gmail.env" 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to upload Gmail configuration" -ForegroundColor Red
    Remove-Item $tempFile -Force
    exit 1
}

# Remove local temp file
Remove-Item $tempFile -Force

Write-Host "Applying Gmail configuration on EC2..." -ForegroundColor Cyan

# Execute the bash script on EC2 to apply the configuration
$remoteScript = @'
#!/bin/bash
set -e

ENV_FILE="/home/ubuntu/sak-erp/apps/api/.env"
GMAIL_ENV="/tmp/sak-gmail.env"

echo "Backing up current .env..."
cp "$ENV_FILE" "${ENV_FILE}.backup-$(date +%Y%m%d-%H%M%S)"

echo "Updating SMTP configuration..."

# Remove old SMTP and EMAIL settings
sed -i '/^SMTP_HOST=/d' "$ENV_FILE"
sed -i '/^SMTP_PORT=/d' "$ENV_FILE"
sed -i '/^SMTP_USER=/d' "$ENV_FILE"
sed -i '/^SMTP_PASS=/d' "$ENV_FILE"
sed -i '/^SMTP_FROM=/d' "$ENV_FILE"
sed -i '/^DEFAULT_EMAIL=/d' "$ENV_FILE"
sed -i '/^EMAIL_ADMIN=/d' "$ENV_FILE"
sed -i '/^EMAIL_SALES=/d' "$ENV_FILE"
sed -i '/^EMAIL_SUPPORT=/d' "$ENV_FILE"
sed -i '/^EMAIL_TECHNICAL=/d' "$ENV_FILE"
sed -i '/^EMAIL_PURCHASE=/d' "$ENV_FILE"
sed -i '/^EMAIL_HR=/d' "$ENV_FILE"
sed -i '/^EMAIL_NOREPLY=/d' "$ENV_FILE"

# Append new Gmail configuration
cat "$GMAIL_ENV" >> "$ENV_FILE"

# Remove temp file
rm "$GMAIL_ENV"

echo "Gmail configuration applied successfully!"

# Restart API service
echo "Restarting sak-api service..."
pm2 restart sak-api

echo "Done! Gmail SMTP is now configured."
'@

ssh -i $KeyFile $Host "bash -s" <<< $remoteScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to apply Gmail configuration" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Gmail Configuration Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Gmail SMTP Settings:" -ForegroundColor Cyan
Write-Host "  Host: smtp.gmail.com" -ForegroundColor White
Write-Host "  Port: 587" -ForegroundColor White
Write-Host "  User: erpsak53@gmail.com" -ForegroundColor White
Write-Host "  All email addresses: erpsak53@gmail.com" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test email functionality in the application" -ForegroundColor White
Write-Host "  2. Check PM2 logs if there are issues: ssh then 'pm2 logs sak-api'" -ForegroundColor White
Write-Host ""
