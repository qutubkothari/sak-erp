# Deployment Documentation

## 🚨 START HERE!

**Read this file first**: [`CURRENT_DEPLOYMENT_GUIDE.md`](./CURRENT_DEPLOYMENT_GUIDE.md)

This contains the actual production deployment process we use.

---

## Quick Reference

### Our Setup (IMPORTANT):
- **Web App**: Runs in **DEVELOPMENT MODE** (intentional, production builds fail)
- **API**: Runs in **PRODUCTION MODE** (works fine)
- **Server**: AWS EC2 t2.micro (1GB RAM)
- **PM2 Config**: Use `ecosystem.config.js` in root

### Deploy Updates:
```bash
# Quick deploy (web - no build)
ssh -i saif-erp.pem ubuntu@13.205.17.214 "cd /home/ubuntu/sak-erp && git pull && pm2 restart sak-web"

# Deploy with API build
ssh -i saif-erp.pem ubuntu@13.205.17.214 "cd /home/ubuntu/sak-erp && git pull && cd apps/api && npm run build && pm2 restart all"
```

---

## Documentation Files

### Primary (Use These):
- **[CURRENT_DEPLOYMENT_GUIDE.md](./CURRENT_DEPLOYMENT_GUIDE.md)** ⭐ - Current production process
- **[PM2_DEPLOYMENT_STRATEGY.md](./PM2_DEPLOYMENT_STRATEGY.md)** - Technical explanation of why we use dev mode
- **[ecosystem.config.js](../ecosystem.config.js)** - PM2 configuration

### Legacy (Don't Use):
- ~~DEPLOYMENT_GUIDE.md~~ - Old guide, mentions production builds that don't work
- ~~deploy.sh~~ - Tries to build production, will fail
- ~~quick-deploy.sh~~ - Outdated

---

## Key Points

1. ✅ **Web runs in dev mode** - this is correct and intentional
2. ✅ **No build step for web** - just `git pull && pm2 restart`
3. ✅ **API needs build** - run `npm run build` before restart
4. ❌ **Don't try production build for web** - it will fail

---

See [`CURRENT_DEPLOYMENT_GUIDE.md`](./CURRENT_DEPLOYMENT_GUIDE.md) for complete instructions.
