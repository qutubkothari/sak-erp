# 🚨 URGENT: Disk Space Full - Server Cannot Build

## **CONFIRMED SPECS:**
- ✅ Instance: **t3.small** (2 vCPU, 2GB RAM) - CORRECT
- ✅ Swap: **437MB** - Added successfully
- ❌ Disk: **6.8GB with only 73MB free (99% full)** - CRITICAL ISSUE

## **THE PROBLEM:**
Next.js production build requires **2-3GB temporary space** for:
- Webpack compilation
- Cache files
- Build artifacts
- Optimized bundles

**Current disk:** 73MB free = Build FAILS with `ENOSPC: no space left on device`

## **IMMEDIATE FIX - Expand EBS Volume (10 minutes)**

### Step 1: Expand EBS Volume in AWS Console

1. Go to **AWS EC2 Console**
2. Click **Volumes** (left sidebar under Elastic Block Store)
3. Find your volume (attached to instance 13.205.17.214)
4. Select it → **Actions** → **Modify Volume**
5. Change size from **8GB** to **20GB** (recommended minimum)
6. Click **Modify** → Confirm

### Step 2: Expand Filesystem on Server

```bash
ssh -i "saif-erp.pem" ubuntu@13.205.17.214

# Check current size
df -h /

# Grow partition (will happen automatically on AWS)
sudo growpart /dev/nvme0n1 1 || sudo growpart /dev/xvda 1

# Resize filesystem
sudo resize2fs /dev/nvme0n1p1 || sudo resize2fs /dev/xvda1

# Verify new size
df -h /

# Should now show ~19GB available
```

### Step 3: Run Production Build

```bash
cd /home/ubuntu/sak-erp/apps/web
rm -rf .next
NODE_OPTIONS='--max-old-space-size=1536' npm run build

# Should now succeed!
```

## **ALTERNATIVE: Clean Space Manually (Temporary, NOT RECOMMENDED)**

If you can't expand disk immediately, you can free ~2GB by removing dev dependencies:

```bash
cd /home/ubuntu/sak-erp

# Remove all dev dependencies (keep only production)
rm -rf node_modules
rm -rf apps/web/node_modules
rm -rf apps/api/node_modules

# Reinstall production only
cd apps/web && npm install --production
cd ../api && npm install --production

# This frees ~1.5GB but removes ability to rebuild
```

**WARNING:** This removes your ability to rebuild the app. Not a real solution!

## **RECOMMENDED DISK SIZES:**

| Usage | Minimum | Recommended | Enterprise |
|-------|---------|-------------|------------|
| Development | 10GB | 20GB | 30GB |
| Staging | 15GB | 25GB | 40GB |
| Production (Single) | 20GB | 30GB | 50GB |
| Production (Multi-tenant) | 30GB | 50GB | 100GB |

**Your 8GB disk is TOO SMALL even for development!**

## **COST IMPACT:**

```
Current: 8GB EBS = $0.80/month
Upgrade: 20GB EBS = $2.00/month
Difference: +$1.20/month

Worth it? ABSOLUTELY YES - enables production builds
```

## **WHY THIS HAPPENED:**

1. Initial server setup used default 8GB disk
2. Monorepo with multiple node_modules (1.7GB total)
3. Git repository (185MB)
4. Next.js build cache grows over time
5. No automated cleanup in place

## **LONG-TERM FIXES:**

### 1. Increase Disk to 20GB (DO THIS NOW)
### 2. Add Automated Cleanup Script

Create `/home/ubuntu/cleanup.sh`:

```bash
#!/bin/bash
# Clean old build artifacts and caches

cd /home/ubuntu/sak-erp

# Clean Next.js cache
rm -rf apps/web/.next/cache

# Clean npm cache
npm cache clean --force

# Clean old logs
pm2 flush

# Clean apt cache
sudo apt-get clean
sudo apt-get autoclean

# Remove old journal logs
sudo journalctl --vacuum-time=7d

echo "Cleanup complete"
df -h /
```

Add to crontab:
```bash
# Run cleanup weekly
crontab -e
# Add: 0 2 * * 0 /home/ubuntu/cleanup.sh
```

### 3. Use Production Builds Instead of Dev Mode

Once disk space is fixed, run:

```bash
# Build frontend once
cd /home/ubuntu/sak-erp/apps/web
npm run build

# Update ecosystem.config.js to use:
script: 'node_modules/.bin/next start'
# instead of:
script: 'npm run dev'

pm2 restart all
```

This:
- ✅ Reduces memory usage
- ✅ Faster performance
- ✅ Proper production caching
- ✅ No more rebuilds on every change

## **WHAT YOU THOUGHT vs REALITY:**

**You thought:** RAM was the issue (upgraded to t3.small) ✅
**Reality:** Disk space is the bottleneck (still on 8GB disk) ❌

**The fix:** Expand EBS volume to 20GB - takes 5 minutes in AWS console

---

**Action Required:** Expand EBS volume to 20GB **NOW**
**Priority:** CRITICAL - Cannot deploy without this
**Cost:** +$1.20/month
**Time:** 10 minutes
