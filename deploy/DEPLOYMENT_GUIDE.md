# 🚀 Deployment Guide - SAK Solutions ERP

## EC2 Instance Details
- **IP Address**: 15.206.164.166
- **OS**: Ubuntu 22.04 LTS
- **Instance Type**: t2.micro / t3.micro (Free Tier)

## Prerequisites

1. **SSH Access**: Ensure you have the .pem key file
2. **Supabase Account**: Create a project at https://supabase.com
3. **GitHub**: Code should be pushed to your repository

## Step 1: Connect to EC2

```bash
# From your local machine
ssh -i "your-key.pem" ubuntu@15.206.164.166
```

## Step 2: Initial Server Setup

```bash
# Run the setup script
curl -o ec2-setup.sh https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/deploy/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

## Step 3: Clone Repository

```bash
cd /var/www/sak-erp
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Or if already cloned
git pull origin main
```

## Step 4: Setup Supabase Database

### 4.1 Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Note down:
   - Database URL (Connection String)
   - Project URL
   - API Keys

### 4.2 Configure Environment

```bash
cd /var/www/sak-erp
cp .env.example .env
nano .env
```

Update with your Supabase credentials:

```env
# Supabase Database URL
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?schema=public"

# Generate strong secrets (use: openssl rand -base64 32)
JWT_SECRET="your-generated-secret-here"
JWT_REFRESH_SECRET="your-generated-refresh-secret-here"

NODE_ENV="production"
PORT=4000
FRONTEND_URL="http://15.206.164.166"

# Optional: Upstash Redis (free tier)
REDIS_HOST="your-redis-host.upstash.io"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"
```

## Step 5: Configure Nginx

```bash
# Copy nginx config
sudo cp deploy/nginx.conf /etc/nginx/sites-available/sak-erp

# Enable site
sudo ln -s /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 6: Deploy Application

**⚠️ DO NOT use deploy.sh - it tries production build which FAILS!**

Instead, use the PM2 ecosystem file:

```bash
cd /home/ubuntu/sak-erp

# Copy ecosystem config
cp ecosystem.config.js /home/ubuntu/sak-erp/

# Install dependencies
cd apps/api && npm install
cd ../web && npm install
cd ../..

# Generate Prisma
cd packages/database
pnpm prisma generate
pnpm prisma db push
cd ../..

# Build API only
cd apps/api
npm run build
cd ../..

# Start with PM2 ecosystem (uses dev mode for web)
pm2 delete all  # Clear any existing
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable on boot
```

This will:
- Build API in production mode ✅
- Run Web in development mode ✅ (production build fails)
- Start both with PM2
- Save configuration

## Step 7: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs sak-erp-api
pm2 logs sak-erp-web

# Check if services are running
curl http://localhost:4000/health
curl http://localhost:3000

# Check public access
curl http://15.206.164.166
```

## Step 8: Seed Initial Data (Optional)

```bash
cd /var/www/sak-erp/packages/database

# Create seed script with Saif Automations as first tenant
pnpm prisma db seed
```

## Access Your Application

- **Frontend**: http://15.206.164.166
- **API**: http://15.206.164.166/api
- **GraphQL Playground**: http://15.206.164.166/graphql

## Common Commands

```bash
# View application logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Monitor resources
pm2 monit

# Redeploy after code changes
cd /var/www/sak-erp
./deploy/deploy.sh

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Security Enhancements (Recommended)

### 1. Setup SSL Certificate (Free with Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate (need domain name)
# sudo certbot --nginx -d your-domain.com

# For IP-only access, you can use CloudFlare Tunnel
```

### 2. Update Security Group (AWS Console)

Ensure these ports are open:
- Port 22 (SSH) - Your IP only
- Port 80 (HTTP) - 0.0.0.0/0
- Port 443 (HTTPS) - 0.0.0.0/0

### 3. Enable Auto-Updates

```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

### Application won't start
```bash
pm2 logs --err
# Check for missing environment variables or port conflicts
```

### Database connection failed
```bash
# Test Supabase connection
cd /var/www/sak-erp/packages/database
pnpm prisma db push
```

### Nginx errors
```bash
sudo nginx -t  # Test config
sudo tail -f /var/log/nginx/error.log  # View errors
```

### Out of memory
```bash
# Check memory usage
free -h

# If needed, create swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Monitoring

### Setup PM2 Monitoring (Optional)

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Backup Strategy

```bash
# Backup database (Supabase has automatic backups)
# Additional manual backup:
cd /var/www/sak-erp/packages/database
pnpm prisma db pull --force
```

## Cost Optimization

- **EC2**: t2.micro (Free Tier) = $0/month (first 12 months)
- **Supabase**: Free tier = $0/month (500MB DB)
- **Upstash Redis**: Free tier = $0/month (10K commands/day)
- **Total**: ~$0-5/month for single client

## Next Steps

1. ✅ Setup domain name (optional)
2. ✅ Configure SSL certificate
3. ✅ Setup monitoring & alerts
4. ✅ Create first tenant (Saif Automations)
5. ✅ Train users on the system

## Support

For issues, contact SAK Solutions development team.
