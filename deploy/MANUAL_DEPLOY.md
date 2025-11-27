# Quick Manual Deployment Guide

## Step 1: Connect to EC2
```bash
ssh -i "c:\Users\musta\OneDrive\Documents\QK-Onedrive\OneDrive\QK-PC\saif-erp.pem" ubuntu@15.206.164.166
```

## Step 2: Setup Prerequisites (Run on EC2)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Create app directory
sudo mkdir -p /var/www/sak-erp
sudo chown -R ubuntu:ubuntu /var/www/sak-erp
```

## Step 3: Upload Code (From Windows)

### Option A: Use WinSCP or FileZilla
- Host: 15.206.164.166
- Username: ubuntu
- Key file: c:\Users\musta\OneDrive\Documents\QK-Onedrive\OneDrive\QK-PC\saif-erp.pem
- Upload to: /var/www/sak-erp

### Option B: Use rsync (if Git Bash installed)
```bash
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='dist' \
  -e "ssh -i 'c:/Users/musta/OneDrive/Documents/QK-Onedrive/OneDrive/QK-PC/saif-erp.pem'" \
  "c:/Users/musta/OneDrive/Documents/GitHub/Manufacturing ERP/" \
  ubuntu@15.206.164.166:/var/www/sak-erp/
```

### Option C: GitHub (Recommended)
```bash
# On Windows - push to GitHub
cd "c:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP"
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub and push

# On EC2 - clone
cd /var/www/sak-erp
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .
```

## Step 4: Setup Environment (On EC2)
```bash
cd /var/www/sak-erp

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
JWT_SECRET="your-secret-here"
JWT_REFRESH_SECRET="your-refresh-secret-here"
NODE_ENV="production"
PORT=4000
FRONTEND_URL="http://15.206.164.166"
EOF

# Edit with your actual credentials
nano .env
```

## Step 5: Install & Build (On EC2)
```bash
cd /var/www/sak-erp

# Install dependencies (this takes a few minutes)
pnpm install

# Generate Prisma Client
cd packages/database
pnpm prisma generate
cd ../..

# Build applications
pnpm build
```

## Step 6: Setup Database (On EC2)
```bash
cd /var/www/sak-erp/packages/database

# Push schema to Supabase
pnpm prisma db push

# Seed initial data
pnpm seed
```

## Step 7: Start Applications (On EC2)
```bash
cd /var/www/sak-erp

# Start API
pm2 start apps/api/dist/main.js --name sak-api

# Start Web
pm2 start apps/web/node_modules/next/dist/bin/next --name sak-web -- start

# Save PM2 config
pm2 save
pm2 startup
```

## Step 8: Configure Nginx (On EC2)
```bash
sudo nano /etc/nginx/sites-available/default
```

Replace content with:
```nginx
server {
    listen 80;
    server_name 15.206.164.166;

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 9: Verify
```bash
pm2 status
pm2 logs
curl http://localhost:3000
curl http://localhost:4000/health
```

## Access Your App
- URL: http://15.206.164.166
- Login: admin@saifautomations.com
- Password: Admin@123

## Troubleshooting
```bash
# View logs
pm2 logs sak-api
pm2 logs sak-web

# Restart services
pm2 restart all

# Check ports
sudo netstat -tulpn | grep LISTEN
```
