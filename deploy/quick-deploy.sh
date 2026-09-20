#!/bin/bash
# Simple manual deployment script

echo "🚀 SAK ERP Deployment"
echo ""

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    sudo npm install -g pnpm
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

echo ""
echo "✅ Prerequisites installed"
echo ""
echo "Next steps:"
echo "1. Upload your code to /var/www/sak-erp (without node_modules)"
echo "2. Create .env file with Supabase credentials"
echo "3. Run: cd /var/www/sak-erp && pnpm install"
echo "4. Run: cd packages/database && pnpm prisma generate"
echo "5. Run: cd packages/database && pnpm prisma db push"
echo "6. Run: pnpm build"
echo "7. Run: pm2 start apps/api/dist/main.js --name api"
echo "8. Run: pm2 start apps/web/.next/standalone/server.js --name web"
