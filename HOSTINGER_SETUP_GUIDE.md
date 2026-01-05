# Hostinger VPS Deployment Guide

## Hostinger VPS Information
- **IP Address**: 72.62.192.228
- **Deployment Script**: `deploy-hostinger.ps1`

## Prerequisites on Hostinger VPS

Before running the deployment script, you need to setup the Hostinger VPS:

### 1. Connect to Hostinger VPS

```bash
ssh root@72.62.192.228
```

Or if you have a different username:
```bash
ssh your_username@72.62.192.228
```

### 2. Install Node.js (v20 LTS)

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node -v  # Should show v20.x.x
npm -v
```

### 3. Install pnpm

```bash
npm install -g pnpm
pnpm -v  # Should show version
```

### 4. Install PM2 (Process Manager)

```bash
npm install -g pm2
pm2 -v  # Should show version

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 5. Install Git (if needed)

```bash
apt install -y git
```

### 6. Create Deployment Directory

```bash
mkdir -p /var/www/sak-erp
cd /var/www/sak-erp
```

### 7. Setup Environment Variables

Create `.env` file in `/var/www/sak-erp/apps/api/.env`:

```bash
mkdir -p /var/www/sak-erp/apps/api
nano /var/www/sak-erp/apps/api/.env
```

Add your environment variables:
```env
DATABASE_URL="your_supabase_connection_string"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_KEY="your_service_key"
JWT_SECRET="your_jwt_secret"
PORT=4000
```

Save and exit (Ctrl+X, then Y, then Enter).

### 8. Install Nginx (Web Server)

```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 9. Configure Nginx Reverse Proxy

Create Nginx configuration:

```bash
nano /etc/nginx/sites-available/sak-erp
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name 72.62.192.228;  # Replace with your domain later

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API (NestJS)
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
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
```

Enable the site:

```bash
ln -s /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl reload nginx
```

### 10. Configure Firewall (if enabled)

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
ufw status
```

## Deployment from Windows

### Option 1: Using SSH Key (Recommended)

1. **Generate SSH Key** (if you don't have one):
   ```powershell
   ssh-keygen -t rsa -b 4096 -f hostinger-key
   ```

2. **Copy public key to Hostinger**:
   ```powershell
   # Display your public key
   Get-Content hostinger-key.pub
   
   # Then on Hostinger VPS:
   # mkdir -p ~/.ssh
   # echo "your_public_key_here" >> ~/.ssh/authorized_keys
   # chmod 600 ~/.ssh/authorized_keys
   ```

3. **Update deploy-hostinger.ps1**:
   - Set `$KEY_PATH = ".\hostinger-key"`
   - Set `$HOSTINGER_USER` to your VPS username

4. **Run Deployment**:
   ```powershell
   .\deploy-hostinger.ps1
   ```

### Option 2: Using Password Authentication

If you don't have SSH keys setup:

1. The script will automatically use password authentication
2. You'll be prompted for password multiple times during deployment
3. Run:
   ```powershell
   .\deploy-hostinger.ps1
   ```

## Post-Deployment: Setup Domain & SSL

### 1. Point Domain to Hostinger

In your domain registrar (e.g., GoDaddy, Namecheap):
- Add an A record: `@` → `72.62.192.228`
- Add an A record: `www` → `72.62.192.228`

Or in Hostinger's DNS manager if your domain is with Hostinger.

### 2. Update Nginx Configuration

```bash
nano /etc/nginx/sites-available/sak-erp
```

Replace `server_name 72.62.192.228;` with your domain:
```nginx
server_name erp.yourdomain.com;
```

Reload Nginx:
```bash
nginx -t
systemctl reload nginx
```

### 3. Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d erp.yourdomain.com

# Test auto-renewal
certbot renew --dry-run
```

Certbot will automatically:
- Obtain SSL certificate
- Configure Nginx for HTTPS
- Setup auto-renewal

## Monitoring & Maintenance

### Check PM2 Status
```bash
pm2 list
pm2 logs sak-web
pm2 logs sak-api
```

### Restart Services
```bash
pm2 restart sak-web
pm2 restart sak-api
```

### Check Nginx Status
```bash
systemctl status nginx
nginx -t  # Test configuration
```

### View Nginx Logs
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000
# Kill the process if needed
kill -9 <PID>

# Check port 4000
lsof -i :4000
```

### PM2 Not Starting
```bash
# Check logs
pm2 logs --err

# Delete and recreate
pm2 delete all
pm2 start apps/api/dist/main.js --name sak-api
cd apps/web && pm2 start npm --name sak-web -- start
```

### Database Connection Issues
```bash
# Test from VPS
curl https://your-project.supabase.co/rest/v1/

# Check .env file
cat /var/www/sak-erp/apps/api/.env
```

## Rollback to EC2

If you want to switch back to EC2:

```powershell
.\deploy-ec2-auto.ps1
```

## Architecture

```
User Browser
    ↓
Domain (erp.yourdomain.com)
    ↓
Hostinger VPS (72.62.192.228)
    ↓
Nginx (Port 80/443)
    ↓
    ├─→ Next.js Frontend (Port 3000) via PM2
    └─→ NestJS API (Port 4000) via PM2
            ↓
        Supabase Database (Cloud)
```

## Performance Tips

1. **Enable Nginx Caching**:
   ```nginx
   proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g;
   ```

2. **PM2 Cluster Mode** (for better performance):
   ```bash
   pm2 start npm --name sak-api -i max -- run start:prod
   ```

3. **Monitor Resources**:
   ```bash
   htop
   pm2 monit
   ```

## Backup Strategy

1. **Database**: Supabase handles backups automatically
2. **Files**: Create backup script:
   ```bash
   tar -czf /root/backups/sak-erp-$(date +%Y%m%d).tar.gz /var/www/sak-erp
   ```

3. **PM2 Configuration**:
   ```bash
   pm2 save
   cp ~/.pm2/dump.pm2 /root/backups/
   ```
