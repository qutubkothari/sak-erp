#!/bin/bash
# Quick script to update SMTP settings on EC2

echo "=== Updating Gmail SMTP Configuration on EC2 ==="
echo ""
echo "This script will help you configure Gmail SMTP on EC2"
echo ""

# Prompt for App Password
read -sp "Enter your Gmail App Password (16 characters): " APP_PASSWORD
echo ""

# SSH into EC2 and update .env
ssh -i saif-erp.pem ubuntu@3.110.100.60 << EOF
cd ~/sak-erp

# Backup current .env
cp .env .env.backup-\$(date +%Y%m%d-%H%M%S)

# Add/Update SMTP settings
echo ""
echo "# Gmail SMTP Configuration (Updated $(date))" >> .env
echo "SMTP_HOST=smtp.gmail.com" >> .env
echo "SMTP_PORT=587" >> .env
echo "SMTP_USER=kutubkothari@gmail.com" >> .env
echo "SMTP_PASS=$APP_PASSWORD" >> .env
echo "SMTP_FROM=kutubkothari@gmail.com" >> .env

# Restart API
pm2 restart sak-api

echo "✓ SMTP configuration updated"
echo "✓ API restarted"
pm2 status
EOF

echo ""
echo "=== Done ==="
echo "Test by creating a Purchase Order or RFQ"
