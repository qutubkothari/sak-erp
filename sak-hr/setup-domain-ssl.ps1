param(
    [string]$Domain = "sakhr.saksolution.com"
)

$ErrorActionPreference = "Stop"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   DOMAIN & SSL SETUP FOR SAK HR" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan

# ====== CONFIG ======
$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$KEY_PATH = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$APP_PORT = "8060"
$EMAIL = "admin@saksolution.com"

Write-Host "[1/5] Testing SSH Connection" -ForegroundColor Yellow
ssh -i $KEY_PATH -o StrictHostKeyChecking=no $HOSTINGER_USER@$HOSTINGER_IP "echo 'Connected'; node -v; nginx -v 2>&1 | head -1 || echo 'Nginx not installed'"
Write-Host "Connection OK`n" -ForegroundColor Green

Write-Host "[2/5] Installing Certbot (Let's Encrypt)" -ForegroundColor Yellow
$installCertbot = "sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx"
ssh -i $KEY_PATH $HOSTINGER_USER@$HOSTINGER_IP $installCertbot
Write-Host "Certbot installed`n" -ForegroundColor Green

Write-Host "[3/5] Creating Nginx Configuration" -ForegroundColor Yellow
$createNginxConfig = @'
cat > /tmp/sakhr-nginx.conf << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name sakhr.saksolution.com;

    location / {
        proxy_pass http://localhost:8060;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_EOF
sudo mv /tmp/sakhr-nginx.conf /etc/nginx/sites-available/sakhr
sudo ln -sf /etc/nginx/sites-available/sakhr /etc/nginx/sites-enabled/sakhr
sudo nginx -t && sudo systemctl reload nginx
'@
ssh -i $KEY_PATH $HOSTINGER_USER@$HOSTINGER_IP $createNginxConfig
Write-Host "Nginx configured`n" -ForegroundColor Green

Write-Host "[4/5] Obtaining SSL Certificate" -ForegroundColor Yellow
Write-Host "Note: Make sure DNS A record is already pointing to $HOSTINGER_IP" -ForegroundColor Cyan
$obtainSSL = "sudo certbot --nginx -d sakhr.saksolution.com --non-interactive --agree-tos --email admin@saksolution.com --redirect"
ssh -i $KEY_PATH $HOSTINGER_USER@$HOSTINGER_IP $obtainSSL
Write-Host "SSL certificate obtained`n" -ForegroundColor Green

Write-Host "[5/5] Setting up Auto-Renewal" -ForegroundColor Yellow
$setupRenewal = "sudo systemctl enable certbot.timer && sudo systemctl start certbot.timer && sudo certbot renew --dry-run"
ssh -i $KEY_PATH $HOSTINGER_USER@$HOSTINGER_IP $setupRenewal
Write-Host "Auto-renewal configured`n" -ForegroundColor Green

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   SETUP COMPLETE!" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "`nYour application is now available at:" -ForegroundColor White
Write-Host "  https://$Domain" -ForegroundColor Cyan
Write-Host "`nSSL certificate will auto-renew every 90 days." -ForegroundColor White
Write-Host "`n"
