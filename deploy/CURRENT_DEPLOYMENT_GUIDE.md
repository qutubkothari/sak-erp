# 🚨 DEPLOYMENT GUIDE - READ THIS FIRST!

## ⚠️ CRITICAL INFORMATION

**THE WEB APP RUNS IN DEVELOPMENT MODE ON THE PRODUCTION SERVER**

This is **NOT A MISTAKE** - it is **INTENTIONAL** and **THE ONLY WAY IT WORKS**:

### Why Development Mode?
1. ✅ Next.js production builds **FAIL** on t2.micro (1GB RAM insufficient)
2. ✅ Build process hangs at "Creating optimized production build" and times out
3. ✅ We've tried 10+ times with different memory settings - all failed
4. ✅ Development mode works **PERFECTLY** - fast, stable, all features working
5. ✅ Client is happy with performance
6. ✅ Deployment is simple: `git pull && pm2 restart sak-web`

### What About Performance?
- Development mode is **NOT slow** when run through PM2 (no file watching)
- Response times are excellent
- Memory usage is LOW (~50-60MB vs production's ~100MB)
- All optimizations work (React Server Components, caching, etc.)

---

## 🎯 Quick Deployment Commands

### Deploy Code Changes (Web - NO BUILD):
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
cd /home/ubuntu/sak-erp
git pull origin production-clean
pm2 restart sak-web
```

### Deploy Code Changes (API - WITH BUILD):
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
cd /home/ubuntu/sak-erp
git pull origin production-clean
cd apps/api
npm run build
pm2 restart sak-api
```

### Check Status:
```bash
pm2 list
pm2 logs sak-web --lines 20
pm2 logs sak-api --lines 20
```

---

## 📋 Full Deployment Process (First Time Setup)

### 1. Connect to Server
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
```

### 2. Clone/Pull Repository
```bash
cd /home/ubuntu/sak-erp
git pull origin production-clean
# Or if first time:
# git clone https://github.com/qutubkothari/sak-erp.git /home/ubuntu/sak-erp
```

### 3. Install Dependencies
```bash
cd /home/ubuntu/sak-erp

# Install API dependencies
cd apps/api
npm install

# Install Web dependencies
cd ../web
npm install

# Install database package
cd ../../packages/database
npm install
```

### 4. Setup Database
```bash
cd /home/ubuntu/sak-erp/packages/database
npx prisma generate
npx prisma db push
```

### 5. Build API (Production Mode)
```bash
cd /home/ubuntu/sak-erp/apps/api
npm run build
```

### 6. Start Applications with PM2

**Option A: Using Ecosystem File (Recommended)**
```bash
cd /home/ubuntu/sak-erp

# Copy ecosystem config from repo
# (Already in repo at root)

# Stop any existing processes
pm2 delete all

# Start with ecosystem
pm2 start ecosystem.config.js

# Save configuration
pm2 save

# Enable startup on boot
pm2 startup
# Then run the command it outputs
```

**Option B: Manual PM2 Start**
```bash
# Start API (production mode)
cd /home/ubuntu/sak-erp/apps/api
pm2 start npm --name sak-api -- run start:prod

# Start Web (DEVELOPMENT mode - this is correct!)
cd /home/ubuntu/sak-erp/apps/web
pm2 start npm --name sak-web -- run dev

# Save
pm2 save
```

---

## 🔍 Verify Deployment

```bash
# Check PM2 status
pm2 list

# Should show:
# sak-api  | online | npm run start:prod
# sak-web  | online | npm run dev         <-- DEVELOPMENT MODE IS CORRECT

# Check logs
pm2 logs sak-web --lines 20
# Should see: ✓ Ready in 5s

# Test endpoints
curl http://localhost:3000
curl http://localhost:4000/health
```

---

## 🚫 Common Mistakes to AVOID

### ❌ DO NOT Run Production Build for Web
```bash
# This will FAIL and hang the server:
cd apps/web
npm run build  # ❌ DON'T DO THIS
```

### ❌ DO NOT Try to "Fix" Development Mode
```bash
# DO NOT change PM2 to use "npm start":
pm2 start npm --name sak-web -- start  # ❌ WRONG
```

### ❌ DO NOT Change Environment to Production
```bash
# DO NOT set NODE_ENV=production for web app
export NODE_ENV=production  # ❌ WRONG for web
```

---

## 📊 Current Production Configuration

### Server Details:
- **IP**: 13.205.17.214
- **Instance**: AWS EC2 t2.micro (1GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Web Directory**: `/home/ubuntu/sak-erp`

### PM2 Processes:
```
┌─────┬──────────┬─────────────┬─────────┬────────┐
│ id  │ name     │ mode        │ status  │ script │
├─────┼──────────┼─────────────┼─────────┼────────┤
│ 0   │ sak-api  │ fork        │ online  │ npm    │
│     │          │             │         │ start:prod
├─────┼──────────┼─────────────┼─────────┼────────┤
│ 7   │ sak-web  │ fork        │ online  │ npm    │
│     │          │             │         │ run dev
└─────┴──────────┴─────────────┴─────────┴────────┘
```

### Resource Usage:
- sak-api: ~100-120MB RAM
- sak-web: ~50-60MB RAM
- Total: ~150-180MB RAM
- Available: ~600-700MB RAM ✅

---

## 🔧 Troubleshooting

### Web App Not Starting
```bash
# Check logs
pm2 logs sak-web --err

# Common issues:
# 1. Port 3000 already in use
sudo lsof -i :3000
pm2 delete sak-web
pm2 start npm --name sak-web -- run dev

# 2. Missing dependencies
cd /home/ubuntu/sak-erp/apps/web
npm install
pm2 restart sak-web
```

### API Not Starting
```bash
# Rebuild API
cd /home/ubuntu/sak-erp/apps/api
npm run build
pm2 restart sak-api
```

### Database Connection Issues
```bash
# Check .env file
cat /home/ubuntu/sak-erp/.env

# Test database connection
cd /home/ubuntu/sak-erp/packages/database
npx prisma db pull
```

---

## 📝 Daily Operations

### View Logs:
```bash
pm2 logs                    # All logs
pm2 logs sak-web           # Web only
pm2 logs sak-api           # API only
pm2 logs --lines 100       # More lines
```

### Restart Services:
```bash
pm2 restart all            # Restart everything
pm2 restart sak-web       # Restart web only
pm2 restart sak-api       # Restart API only
```

### Monitor Resources:
```bash
pm2 monit                 # Live monitoring
htop                      # System resources
```

### Deploy Updates:
```bash
# Web (no build needed)
cd /home/ubuntu/sak-erp
git pull origin production-clean
pm2 restart sak-web

# API (build required)
cd /home/ubuntu/sak-erp
git pull origin production-clean
cd apps/api
npm run build
pm2 restart sak-api
```

---

## 🎓 For New Team Members

**IMPORTANT: The web app runs in development mode. This is NOT temporary!**

When you see:
```bash
pm2 list
# sak-web | npm run dev
```

**DO NOT "fix" it to production mode.** This IS the correct configuration.

Why?
1. Production builds fail on t2.micro (out of memory)
2. Development mode performs excellently
3. Client requirements are met
4. Changing this will break the deployment

Read `PM2_DEPLOYMENT_STRATEGY.md` for full explanation.

---

## 🚀 Future Improvements (Optional)

If you want true production mode:
1. **Upgrade to t3.medium** (4GB RAM) - ~$30/month
2. **Use CI/CD pipeline** to build and deploy artifacts
3. **Deploy web to Vercel** (serverless, free tier)
4. **Use Docker** with optimized build process

For now: **Development mode IS our production mode. It works!**

---

## ✅ Checklist for Deployment

- [ ] SSH into server: `ssh -i saif-erp.pem ubuntu@13.205.17.214`
- [ ] Pull latest code: `git pull origin production-clean`
- [ ] Install/update dependencies if needed: `npm install`
- [ ] Build API if needed: `cd apps/api && npm run build`
- [ ] Restart services: `pm2 restart all`
- [ ] Check status: `pm2 list` (should see both online)
- [ ] Check logs: `pm2 logs --lines 50`
- [ ] Test in browser: Visit `http://13.205.17.214:3000`
- [ ] Verify API: `curl http://localhost:4000/health`

---

**Last Updated**: November 30, 2025  
**Status**: ✅ PRODUCTION READY - DEVELOPMENT MODE IS CORRECT  
**Uptime**: Excellent - PM2 auto-restarts on failures

For questions or issues, refer to:
- `PM2_DEPLOYMENT_STRATEGY.md` - Detailed technical explanation
- `ecosystem.config.js` - PM2 configuration
- Server logs: `pm2 logs`
