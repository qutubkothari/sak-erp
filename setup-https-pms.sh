#!/bin/bash
#
# HTTPS Setup Script for pms.saksolution.com
# SAK ERP Production Deployment
#
# Run this script on your Hostinger VPS after DNS is configured
# Usage: bash setup-https-pms.sh
#

set -e

echo "========================================="
echo "SAK ERP - HTTPS Setup for pms.saksolution.com"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root: sudo bash setup-https-pms.sh"
    exit 1
fi

# Step 1: Install Certbot
echo "Step 1: Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Step 2: Create Nginx Configuration
echo "Step 2: Creating Nginx configuration..."
cat > /etc/nginx/sites-available/sak-erp <<'EOF'
# Main site server block
server {
    listen 80;
    server_name pms.saksolution.com www.pms.saksolution.com erp.saifseas.com;

    location = /api {
        return 308 /api/v1;
    }

    location = /api/v1 {
        return 308 /api/v1/;
    }

    location /api/v1/ {
        proxy_pass http://localhost:4000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Step 3: Enable Site
echo "Step 3: Enabling site..."
ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx

# Step 4: Configure Firewall
echo "Step 4: Configuring firewall..."
ufw allow 'Nginx Full'
ufw --force enable

# Step 5: Obtain SSL Certificate
echo "Step 5: Obtaining SSL certificate from Let's Encrypt..."
echo "NOTE: This requires your DNS to be properly configured!"
echo "Make sure these A records point to this server's IP:"
echo "  - pms.saksolution.com"
echo "  - www.pms.saksolution.com"
echo "  - erp.saifseas.com"
echo ""
read -p "DNS configured? Press Enter to continue or Ctrl+C to abort..."

certbot --nginx \
    -d pms.saksolution.com \
    -d www.pms.saksolution.com \
    -d erp.saifseas.com \
    --non-interactive \
    --agree-tos \
    --redirect \
    --email admin@saksolution.com

# Step 6: Test Auto-Renewal
echo "Step 6: Testing SSL certificate auto-renewal..."
certbot renew --dry-run

# Step 7: Setup PM2 Auto-Start
echo "Step 7: Configuring PM2 auto-start..."
if command -v pm2 &> /dev/null; then
    pm2 startup
    pm2 save
    echo "PM2 auto-start configured!"
else
    echo "PM2 not found. Skipping auto-start setup."
fi

echo ""
echo "========================================="
echo "✅ HTTPS Setup Complete!"
echo "========================================="
echo ""
echo "Your SAK ERP is now accessible at:"
echo "  Frontend: https://pms.saksolution.com"
echo "  API:      https://pms.saksolution.com/api/v1"
echo "  Alias:    https://erp.saifseas.com"
echo "  HR:       https://pms.saksolution.com/dashboard/hr"
echo ""
echo "Next steps:"
echo "1. Update environment variables in .env files"
echo "2. Redeploy application with updated URLs"
echo "3. Test all duplicate detection features"
echo ""
echo "SSL certificates will auto-renew every 90 days"
echo "========================================="
