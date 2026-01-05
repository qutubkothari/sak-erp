#!/bin/bash
# Deploy SAK ERP from GitHub to Hostinger VPS
set -e

echo "=== SAK ERP Hostinger Deployment from GitHub ==="

# Install Node.js 20
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -S bash -
    sudo apt-get install -y nodejs
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    sudo npm install -g pnpm
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
    pm2 startup
fi

# Clone/pull repository
DEPLOY_DIR="/var/www/sak-erp"
if [ -d "$DEPLOY_DIR" ]; then
    echo "Updating repository..."
    cd "$DEPLOY_DIR"
    git pull origin main
else
    echo "Cloning repository..."
    sudo mkdir -p /var/www
    sudo chown -R $USER:$USER /var/www
    git clone https://github.com/qutubk/sak-erp.git "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Create .env for API
cat > apps/api/.env << 'EOF'
DATABASE_URL="postgresql://postgres:SAK123!1@db.wqjfvvkucmqvbtaekjlk.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:SAK123!1@db.wqjfvvkucmqvbtaekjlk.supabase.co:5432/postgres"
SUPABASE_URL="https://wqjfvvkucmqvbtaekjlk.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmtjbXF2YnRhZWtqbGsiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczMzc2NDUyMCwiZXhwIjoyMDQ5MzQwNTIwfQ.PpW3M1MFZ_MRAb8fZ-0ww5lnxxN9QZPLmhkKGkW8HoQ"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxamZ2dmtjbXF2YnRhZWtqbGsiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzMzNzY0NTIwLCJleHAiOjIwNDkzNDA1MjB9.GxYJxnPRRHgLNaUfNkAL8z4_HNa9jvNfbg9PHMsgz-g"
JWT_SECRET="your-secret-key-here-change-in-production"
PORT=4000
NODE_ENV=production
EOF

# Build applications
echo "Building applications..."
cd apps/web
NEXT_PUBLIC_API_URL="/api/v1" pnpm build
cd ../api
pnpm build
cd ../..

# Generate Prisma client
cd apps/api
pnpm prisma generate
cd ../..

# Stop existing PM2 processes
pm2 stop all || true
pm2 delete all || true

# Start API
cd apps/api
pm2 start dist/main.js --name sak-api --time
cd ../..

# Start Web
cd apps/web
pm2 start "pnpm start" --name sak-web --time
cd ..

# Save PM2 processes
pm2 save

echo "=== Deployment Complete ==="
pm2 status

# Install Nginx if needed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
    
    # Create Nginx config
    sudo tee /etc/nginx/sites-available/sak-erp > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name 72.62.192.228;
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        client_max_body_size 50M;
    }
}
NGINXEOF
    
    sudo ln -sf /etc/nginx/sites-available/sak-erp /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    
    echo "Nginx configured and started"
fi

echo ""
echo "Deployment successful!"
echo "Frontend: http://72.62.192.228"
echo "API:      http://72.62.192.228/api/v1"
