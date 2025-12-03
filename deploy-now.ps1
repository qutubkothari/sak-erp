# Quick deployment script for production server
# Run this from your local machine with: .\deploy-now.ps1

Write-Host "Connecting to production server..." -ForegroundColor Green

# Use your existing SSH connection method
# Replace this with your actual SSH command that works
ssh ubuntu@13.205.17.214 @"
cd ~/manufacturing_erp
echo 'Pulling latest code...'
git pull origin production-clean
echo 'Building application...'
npm run build
echo 'Restarting API...'
pm2 restart api
echo 'Deployment complete!'
pm2 status
"@
