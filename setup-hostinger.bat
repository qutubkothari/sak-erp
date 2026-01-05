@echo off
echo ========================================
echo Hostinger VPS Setup - Automated
echo ========================================
echo.
echo This will setup your Hostinger VPS for deployment
echo IP: 72.62.192.228
echo Username: qutubk
echo.
echo You will be prompted for password: 3998
echo.
pause

echo.
echo Step 1: Uploading setup script...
pscp -pw 3998 setup-hostinger-vps.sh qutubk@72.62.192.228:/tmp/setup-hostinger-vps.sh

echo.
echo Step 2: Running setup script on VPS...
plink -pw 3998 qutubk@72.62.192.228 "chmod +x /tmp/setup-hostinger-vps.sh && bash /tmp/setup-hostinger-vps.sh"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next: Update environment variables
echo   Run: plink -pw 3998 qutubk@72.62.192.228
echo   Then: nano /var/www/sak-erp/apps/api/.env
echo.
echo After that, run: .\deploy-hostinger.ps1
echo.
pause
