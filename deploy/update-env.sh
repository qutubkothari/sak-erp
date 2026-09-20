#!/bin/bash
# Quick script to update environment variables on EC2

APP_DIR="/var/www/sak-erp"

echo "🔧 Environment Variable Helper"
echo ""

# Generate JWT secrets
echo "Generating JWT secrets..."
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

echo ""
echo "Add these to your .env file:"
echo ""
echo "JWT_SECRET=\"$JWT_SECRET\""
echo "JWT_REFRESH_SECRET=\"$JWT_REFRESH_SECRET\""
echo ""
echo "DATABASE_URL=\"postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres\""
echo ""
echo "To edit .env file:"
echo "nano $APP_DIR/.env"
