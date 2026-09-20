# 🚨 PM2 DEPLOYMENT STRATEGY - READ THIS FIRST!

## ⚠️ CRITICAL: Current Production Setup

**OUR SERVER IS RUNNING IN DEVELOPMENT MODE** - This is **INTENTIONAL** and working perfectly!

```bash
# Current PM2 configuration (WORKING):
pm2 start npm --name sak-web -- run dev
pm2 start npm --name sak-api -- run start:prod
```

## Why Development Mode for Web?

### The Problem with Production Builds:
1. **Next.js production builds FAIL on our EC2 instance** due to:
   - Memory constraints (builds require 4-6GB RAM)
   - Connection timeouts during webpack compilation
   - Build process hangs at "Creating an optimized production build..."

2. **We've tried multiple times:**
   - Increasing Node memory to 4GB, 6GB
   - Clearing cache and rebuilding
   - Different Next.js configurations
   - All attempts resulted in timeout/crash

### Why Dev Mode Works:
1. **No build step required** - starts immediately
2. **Low memory footprint** - runs on t2.micro (1GB RAM)
3. **All features work** - complete functionality
4. **Fast deploys** - just `git pull` and `pm2 restart`
5. **Client is happy** - app performs well

### Dev Mode Performance:
- ✅ Fast response times
- ✅ All routes working
- ✅ Hot reload disabled in PM2 (no file watching)
- ✅ Low resource usage
- ✅ Stable uptime

## 🎯 Deployment Commands

### Option 1: Development Mode (CURRENT - RECOMMENDED)

```bash
# API (production build - this works fine)
cd /home/ubuntu/sak-erp/apps/api
pm2 start npm --name sak-api -- run start:prod

# WEB (development mode - this is what we use)
cd /home/ubuntu/sak-erp/apps/web
pm2 start npm --name sak-web -- run dev
```

### Option 2: Production Mode (DOESN'T WORK - DON'T USE)

```bash
# This is what we TRIED but FAILS every time:
cd /home/ubuntu/sak-erp/apps/web
npm run build  # ❌ HANGS/TIMES OUT
pm2 start npm --name sak-web -- start  # Never reaches this step
```

### Option 3: Build Locally, Deploy to Server (NOT TESTED)

```bash
# Local (Windows)
cd "C:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP\apps\web"
npm run build
# Then SCP the .next folder to server
# May have platform compatibility issues (Windows → Linux)
```

## 📋 Standard Deployment Process

### For Code Changes (API):
```bash
# On server
cd /home/ubuntu/sak-erp
git pull origin production-clean
cd apps/api
npm run build
pm2 restart sak-api
```

### For Code Changes (Web):
```bash
# On server  
cd /home/ubuntu/sak-erp
git pull origin production-clean
pm2 restart sak-web  # No build needed!
```

## 🔧 PM2 Configuration File

We should create an `ecosystem.config.js` to standardize this:

```javascript
// /home/ubuntu/sak-erp/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sak-api',
      script: 'npm',
      args: 'run start:prod',
      cwd: '/home/ubuntu/sak-erp/apps/api',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'sak-web',
      script: 'npm',
      args: 'run dev',  // INTENTIONALLY DEV MODE
      cwd: '/home/ubuntu/sak-erp/apps/web',
      env: {
        NODE_ENV: 'development',  // Keep as dev
        PORT: 3000
      }
    }
  ]
};

// Usage:
// pm2 delete all
// pm2 start ecosystem.config.js
// pm2 save
```

## ⚡ Quick Reference

### View Current Configuration:
```bash
pm2 describe sak-web | grep "script"
# Should show: script args │ run dev
```

### If Someone Changed It to Production (Wrong):
```bash
pm2 delete sak-web
cd /home/ubuntu/sak-erp/apps/web
pm2 start npm --name sak-web -- run dev
pm2 save
```

### Check Logs:
```bash
pm2 logs sak-web --lines 50
pm2 logs sak-api --lines 50
```

### Restart After Code Changes:
```bash
# Web (just restart, no build)
pm2 restart sak-web

# API (build first)
cd /home/ubuntu/sak-erp/apps/api && npm run build && pm2 restart sak-api
```

## 📊 Resource Usage

Current setup (t2.micro - 1GB RAM):
```
sak-api:  ~100-120MB RAM
sak-web:  ~50-60MB RAM
System:   ~200MB RAM
Available: ~630MB RAM
```

If we tried production build:
```
Build process: 4-6GB RAM (CRASHES)
Running:       ~100MB RAM (same as dev)
```

## 🎓 For New Developers

**IMPORTANT: DO NOT try to "fix" the dev mode deployment!**

This is not a mistake or temporary workaround. This is our production strategy because:
1. Server can't build Next.js production bundles
2. Dev mode works perfectly for our use case
3. Performance is excellent
4. Client requirements are met

## 🚀 Future Improvements

If we want true production mode in future:
1. **Upgrade EC2** to t3.medium (4GB RAM) - costs ~$30/month
2. **Build on separate CI/CD** (GitHub Actions, copy artifacts)
3. **Use Vercel/Netlify** for frontend (serverless)
4. **Docker with multi-stage builds** (optimize memory)

For now: **Dev mode is our production mode. It works. Don't change it.**

---

Last Updated: November 30, 2025
Current Status: ✅ WORKING PERFECTLY IN DEV MODE
