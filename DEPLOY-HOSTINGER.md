# Deploy to Hostinger (pms.saksolution.com)

## Prerequisites
- Code already pushed to GitHub ✅ (done)
- SSH access to Hostinger server
- PM2 installed on server

## Step 1: SSH into Hostinger

```bash
ssh your-username@pms.saksolution.com
# Or use the IP address
ssh username@your-server-ip
```

## Step 2: Navigate to Project Directory

```bash
cd ~/domains/pms.saksolution.com/sak-erp
# Or wherever your project is located
```

## Step 3: Pull Latest Code

```bash
git pull origin main
```

## Step 4: Deploy API (NestJS)

```bash
cd apps/api
pnpm install
pnpm build

# Restart API service
pm2 restart sak-erp-api
# If not running, start it:
# pm2 start dist/main.js --name sak-erp-api

# Check logs
pm2 logs sak-erp-api --lines 50
```

## Step 5: Deploy Web (Next.js)

```bash
cd ../web
pnpm install
pnpm build

# Restart Web service
pm2 restart sak-erp-web
# If not running, start it:
# pm2 start npm --name sak-erp-web -- start

# Check logs
pm2 logs sak-erp-web --lines 50
```

## Step 6: Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check if services are running
pm2 list
```

## Step 7: Save PM2 Configuration

```bash
pm2 save
pm2 startup
```

## Troubleshooting

### If build fails:
```bash
# Clear node_modules and rebuild
rm -rf node_modules
pnpm install
pnpm build
```

### If API won't start:
```bash
# Check environment variables
cat .env

# Check port availability
netstat -tulpn | grep :4000
```

### If Web won't start:
```bash
# Check port availability
netstat -tulpn | grep :3000
```

### View detailed logs:
```bash
pm2 logs sak-erp-api --lines 100
pm2 logs sak-erp-web --lines 100
```

## Quick Deploy Script

Create this as `deploy.sh` in project root:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying SAK-ERP to Production..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# Deploy API
echo "🔧 Building API..."
cd apps/api
pnpm install
pnpm build
pm2 restart sak-erp-api

# Deploy Web
echo "🌐 Building Web..."
cd ../web
pnpm install
pnpm build
pm2 restart sak-erp-web

# Show status
echo "✅ Deployment complete!"
pm2 status
```

Make it executable:
```bash
chmod +x deploy.sh
```

Then run:
```bash
./deploy.sh
```

---

## What's Being Deployed

This deployment includes:

✅ **Smart Job Orders**
- BOM explosion preview
- Auto sub-assembly creation
- Material issuing at creation

✅ **QC Gating Flow**
- UIDs created with PENDING_QC status
- Stock added only after QC approval
- Complete traceability

✅ **Multi-level BOM Support**
- Recursive sub-assembly handling
- child_bom_id resolution

✅ **Job Order Summary**
- Materials issued display
- Sub-assemblies auto-completed

---

## Post-Deployment Testing

1. Go to https://pms.saksolution.com/login
2. Log in
3. Navigate to Production → Job Orders
4. Click "+ Create Job Order"
5. Select FG1, quantity 1
6. Verify preview shows sub-assemblies
7. Click "Create Job Order"
8. Check materials reduced in inventory
9. Complete job order
10. Verify UIDs created with PENDING_QC
11. Click "Complete QC"
12. Approve UIDs
13. Submit QC Results
14. Verify stock added for approved quantity
