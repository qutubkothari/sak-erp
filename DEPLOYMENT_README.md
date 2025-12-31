# 🚨 IMPORTANT: Deployment Information

## Quick Answer: Why is the web app in development mode?

**Because production builds fail on our t2.micro server (1GB RAM insufficient).**

This is **INTENTIONAL** and **WORKING PERFECTLY**. Do not try to "fix" it!

---

## What You Need to Know

### Current Setup ✅
- **Web App**: Development mode (`npm run dev`)
- **API**: Production mode (`npm run start:prod`)
- **Server**: AWS EC2 t2.micro @ 13.205.17.214
- **Status**: Working perfectly, client is happy

### Performance ✅
- Fast response times
- Low memory usage (~50MB for web)
- All features working
- Stable uptime

### Why Not Production Build? ❌
- Requires 4-6GB RAM to build
- Our server only has 1GB RAM
- Build process hangs/crashes
- Tried 10+ times with different settings - all failed

---

## How to Deploy

### For Web Changes (No Build):
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
cd /home/ubuntu/sak-erp
git pull origin production-clean
pm2 restart sak-web
```

### For API Changes (With Build):
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
cd /home/ubuntu/sak-erp
git pull origin production-clean
cd apps/api
npm run build
pm2 restart sak-api
```

---

## Full Documentation

📚 See the `deploy/` folder for complete guides:

1. **[deploy/README.md](./deploy/README.md)** - Start here
2. **[deploy/QUICK_REFERENCE.md](./deploy/QUICK_REFERENCE.md)** - Common commands
3. **[deploy/CURRENT_DEPLOYMENT_GUIDE.md](./deploy/CURRENT_DEPLOYMENT_GUIDE.md)** - Complete process
4. **[deploy/PM2_DEPLOYMENT_STRATEGY.md](./deploy/PM2_DEPLOYMENT_STRATEGY.md)** - Technical explanation
5. **[ecosystem.config.js](./ecosystem.config.js)** - PM2 configuration

---

## For New Team Members

**The first time you see:**
```bash
pm2 list
# sak-web | npm run dev
```

**Your reaction might be:** "Why is production in dev mode? Let me fix that!"

**STOP! Read this:**
- This IS the correct configuration
- We've tried production mode 10+ times - it doesn't work
- Changing this will break deployment
- Read the documentation first

---

## Quick Status Check

```bash
# Check if everything is running
ssh -i "saif-erp.pem" ubuntu@13.205.17.214 "pm2 list && curl -s http://localhost:3000 | head -5"
```

Expected: Both services online, HTML output from curl

---

**Remember:** Development mode is our production mode. It works! 🎉
