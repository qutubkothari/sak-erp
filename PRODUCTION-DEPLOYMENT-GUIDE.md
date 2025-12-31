# Production Deployment Guide

## ✅ EC2 Cleanup Completed (Dec 31, 2025)

### Removed from Production:
- ❌ `.git/` directory (276MB) - Git history not needed
- ❌ `migrations/` folder (124KB) - SQL files managed separately
- ❌ `deploy/` folder (36KB) - Deployment scripts stay local
- ❌ `scripts/` folder (16KB) - Debug scripts not needed
- ❌ All `.md` documentation files
- ❌ All `.sql` migration files
- ❌ All `.sh`, `.py`, `.txt` helper scripts
- ❌ Excel files (`.xlsx`)

### Result:
- **Before:** 2.2GB
- **After:** 2.1GB (will reduce more after removing uploads/)
- **Production now contains ONLY:** apps/, packages/, node_modules/, config files

---

## Future Deployments

### What to Deploy:
```
✅ apps/           (source code)
✅ packages/       (shared packages)
✅ package.json
✅ pnpm-workspace.yaml
✅ pnpm-lock.yaml
✅ turbo.json
✅ .env (production environment variables)
```

### What to NEVER Deploy:
```
❌ .git/          (use git pull on server OR deploy build artifacts only)
❌ *.md           (documentation - keep local)
❌ *.sql          (migrations - run separately via psql)
❌ migrations*/   (SQL files)
❌ archive/       (debug files)
❌ deploy/        (deployment scripts)
❌ scripts/       (helper scripts)
❌ *.xlsx         (test data)
❌ test-*.js      (test files)
❌ check-*.js     (debug scripts)
❌ *.pem          (SSH keys - manage separately)
```

---

## Recommended Deployment Methods

### Option 1: Git Pull (Current - Simplest)
```bash
ssh ubuntu@3.110.100.60
cd /home/ubuntu/sak-erp
git pull origin main
pnpm install --frozen-lockfile
pnpm --filter @sak-erp/web build
pm2 restart all
```

**Pros:** Simple, version controlled
**Cons:** Requires .git on server, pulls all files

### Option 2: Build Artifacts Only (Best for Production)
```powershell
# Local: Build
pnpm build
cd apps/web
tar -czf web-dist.tar.gz .next/ package.json

# Deploy
scp web-dist.tar.gz ubuntu@3.110.100.60:/home/ubuntu/
ssh ubuntu@3.110.100.60 "cd /home/ubuntu/sak-erp/apps/web && tar -xzf ~/web-dist.tar.gz && pm2 restart sak-web"
```

**Pros:** Smallest deployment, fastest, no build on server
**Cons:** Requires build step locally

### Option 3: rsync with Exclude (Good Balance)
```powershell
rsync -avz --exclude-from='.deployignore' -e "ssh -i saif-erp.pem" . ubuntu@3.110.100.60:/home/ubuntu/sak-erp/
```

**Pros:** Fast incremental updates, excludes unnecessary files
**Cons:** Requires rsync on Windows (use WSL or install)

---

## Current Production State

### EC2 Instance: t3.medium (3.110.100.60)
- **CPU:** 2 vCPUs
- **RAM:** 4GB (779MB used - healthy)
- **Disk:** 19GB total, 14GB used (74%)
- **OS:** Ubuntu

### Running Services:
```
PM2 ID  Service    Status   Memory
37      sak-api    online   63MB
40      sak-web    building 96MB
```

### Node Modules: 1.4GB (optimized from 3.6GB)

---

## Next Steps

1. ✅ **Cleanup Complete:** EC2 now has only production files
2. 🔄 **Build in Progress:** Web app building with clean dependencies  
3. ⏭️ **After Build:** Start web, verify functionality
4. 📝 **Future:** Use Option 2 (build artifacts) for zero-downtime deploys
