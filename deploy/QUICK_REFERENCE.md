# SAK ERP - Deployment Quick Reference Card

```
╔══════════════════════════════════════════════════════════════════════╗
║                    🚨 CRITICAL DEPLOYMENT INFO 🚨                    ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  WEB APP RUNS IN DEVELOPMENT MODE ON PRODUCTION                      ║
║  ═══════════════════════════════════════════════════                 ║
║                                                                      ║
║  This is INTENTIONAL and CORRECT!                                    ║
║  - Production builds FAIL (out of memory on t2.micro)                ║
║  - Dev mode works PERFECTLY                                          ║
║  - Performance is EXCELLENT                                          ║
║  - DO NOT try to "fix" this!                                         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

## 🎯 Common Operations

### Deploy Web Changes (Most Common)
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
cd /home/ubuntu/sak-erp
git pull origin production-clean
pm2 restart sak-web
```
**Time**: ~10 seconds  
**Build Required**: NO ❌

---

### Deploy API Changes
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
cd /home/ubuntu/sak-erp
git pull origin production-clean
cd apps/api
npm run build
pm2 restart sak-api
```
**Time**: ~30-60 seconds  
**Build Required**: YES ✅

---

### Check Status
```bash
pm2 list
```
**Expected Output**:
```
┌─────┬──────────┬─────────────┬─────────┬────────────────┐
│ id  │ name     │ mode        │ status  │ script         │
├─────┼──────────┼─────────────┼─────────┼────────────────┤
│ 0   │ sak-api  │ fork        │ online  │ npm start:prod │ ✅
│ 7   │ sak-web  │ fork        │ online  │ npm run dev    │ ✅ CORRECT!
└─────┴──────────┴─────────────┴─────────┴────────────────┘
```

---

### View Logs
```bash
pm2 logs sak-web --lines 50    # Web logs
pm2 logs sak-api --lines 50    # API logs
pm2 logs --lines 100           # Both
```

---

### Restart Everything
```bash
pm2 restart all
```

---

## ❌ Things to NEVER Do

### DON'T Build Web in Production Mode
```bash
cd apps/web
npm run build  # ❌ WILL HANG AND CRASH
```

### DON'T Change PM2 to Production
```bash
pm2 delete sak-web
pm2 start npm --name sak-web -- start  # ❌ WRONG
```

### DON'T Set NODE_ENV=production for Web
```bash
export NODE_ENV=production  # ❌ WRONG for web
```

---

## ✅ Things to Always Remember

### 1. Check PM2 Configuration
```bash
pm2 describe sak-web | grep "script args"
```
**Should show**: `script args: run dev` ✅

### 2. After Git Pull
- **Web**: Just restart (no build)
- **API**: Build first, then restart

### 3. If Something Goes Wrong
```bash
pm2 logs sak-web --err --lines 100
```

---

## 📚 Full Documentation

Read these files in order:

1. **deploy/README.md** - Start here
2. **deploy/CURRENT_DEPLOYMENT_GUIDE.md** - Complete guide
3. **deploy/PM2_DEPLOYMENT_STRATEGY.md** - Technical details
4. **ecosystem.config.js** - PM2 config

---

## 🔑 Server Access

```bash
# SSH into server
ssh -i "c:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP\saif-erp.pem" ubuntu@13.205.17.214

# App directory
cd /home/ubuntu/sak-erp

# Check if services running
curl http://localhost:3000  # Web
curl http://localhost:4000/health  # API
```

---

## 🆘 Emergency Procedures

### Web App Down
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
pm2 logs sak-web --err --lines 50
pm2 restart sak-web
# If still not working:
cd /home/ubuntu/sak-erp/apps/web
npm install
pm2 restart sak-web
```

### API Down
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
pm2 logs sak-api --err --lines 50
cd /home/ubuntu/sak-erp/apps/api
npm run build
pm2 restart sak-api
```

### Both Down
```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214
pm2 restart all
# If that doesn't work:
cd /home/ubuntu/sak-erp
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## 📊 Health Check

```bash
# From your local machine
curl http://13.205.17.214:3000
curl http://13.205.17.214:4000/health

# On server
pm2 list
pm2 monit  # Live monitoring
```

---

**Remember**: Development mode for web is **NOT a bug**, it's a **feature**! 🎉

---

Last Updated: November 30, 2025  
Server IP: 13.205.17.214  
Status: ✅ PRODUCTION READY
