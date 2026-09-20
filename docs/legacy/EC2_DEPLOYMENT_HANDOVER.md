# EC2 Deployment Summary — Manufacturing ERP (with HR Module)

## 🎯 Objective
Deploy **Manufacturing ERP** system with the new **HR Module** (India/UAE compliance with auto-calculating PF, ESI, PT) to **AWS EC2** for client access.

---

## 📍 Current Status
- ✅ **Deployment complete** — application is live and running on EC2.
- ⚠️ **Last issue fixed**: Frontend API base path corrected from `/hr/employees` → `/api/v1/hr/employees`.
- 🔄 **Action needed (user test)**: Hard refresh the browser (`Ctrl+Shift+R`) and re-test.

---

## 🌐 Access Details

### EC2 Instance
- **Current Public IP**: `13.200.4.54` (changes on reboot → allocate **Elastic IP**)
- **Previous Public IP**: `13.205.17.214` (after first reboot)
- **OS**: Ubuntu 22.04
- **RAM**: 2GB (tight for builds; can freeze during `pnpm install/build`)
- **Disk**: 20GB (was ~41% used: ~7.4GB/19GB)
- **Project path**: `/home/ubuntu/sak-erp`
- **Git branch**: `production-clean`

### SSH
- **User**: `ubuntu`
- **SSH key file (local)**: `saif-erp.pem` (DO NOT commit; rotate ASAP)
- **Command**:
  ```bash
  ssh -i ./saif-erp.pem ubuntu@13.200.4.54
  ```

### Application URLs
- **Frontend**: http://13.200.4.54:3000
- **API**: http://13.200.4.54:4000/api/v1
- **HR Module**: http://13.200.4.54:3000/dashboard/hr

---

## 🚀 Deployment Infrastructure

### Process Manager (PM2)
- Expected PM2 apps:
  - `sak-api` (NestJS API)
  - `sak-web` (Next.js web)

Useful commands:
```bash
pm2 list
pm2 logs sak-api
pm2 logs sak-web
pm2 restart sak-api
pm2 restart sak-web
pm2 save
```

### Environment Configuration (EC2)

**API env**: `/home/ubuntu/sak-erp/apps/api/.env`
- Required (example):
  ```bash
  NODE_ENV=production
  PORT=4000
  CORS_ORIGIN=http://13.200.4.54:3000
  # DATABASE_URL=... (currently disabled due to IPv6 issue)
  ```

**Web env**: `/home/ubuntu/sak-erp/apps/web/.env.local`
- Required (example):
  ```bash
  NEXT_PUBLIC_API_URL=http://13.200.4.54:4000/api/v1
  ```

---

## 📦 Application Architecture

### Technology Stack
- **Frontend**: Next.js 14.2.33, React 18.3.1, TypeScript
- **Backend**: NestJS (Node.js 20.19.6)
- **Package manager**: pnpm (monorepo workspace)
- **Process manager**: PM2
- **Database**: PostgreSQL (connection currently disabled due to IPv6 issue on EC2)

---

## 🆕 HR Module — What Was Deployed

### India Compliance (Auto-calculating)
- **PF (Provident Fund)**: 12% employee + 12% employer (₹15k ceiling, EPS/EPF split)
- **ESI (Employee State Insurance)**: 0.75% employee + 3.25% employer (₹21k wage limit)
- **Professional Tax**: State-wise slabs (MH: ₹200, KA: ₹200, WB, TN, GJ, AP, TS, AS, MP)
- **TDS**: New & Old regime (FY 2024–25 slabs)
- **Gratuity**: $(\text{Basic+DA} \times 15 \times \text{Years})/26$, max ₹20 lakhs
- **Form 16**: TDS certificate generator
- **Bonus**: 8.33%–20% calculation

### UAE Compliance (Ready)
- **End of Service Benefits**: 21 days (<5yr), 30 days (>5yr), max 2yr salary
- **WPS**: SIF file generator
- **Leave Entitlement**: 30 days annual, 90 days sick, 60 days maternity
- **Gratuity Calculator**: UAE Labour Law compliant

### Core HR Features
- Monthly payroll processing
- Salary components (Basic, HRA, allowances, deductions)
- Manual KPI entry (quality, productivity, teamwork, customer satisfaction)
- Merit/demerit system
- Professional print templates
- Auto-fill from saved components

### HR Module Package
- Package: `@sak-erp/hr-module`
- Location: `packages/hr-module`
- Version: `1.0.0`
- Build output: `dist/`
- Portable: Designed to be reusable in future UAE-market projects

---

## 🛠️ Deployment Scripts in Repo

- `deploy-ec2-manual.ps1`: Step-by-step redeploy over SSH (recommended)
- `deploy-ec2.ps1`: Builds locally and prepares a deployment archive (lighter EC2 workload)
- `deploy-ec2.sh`: Bash deploy helper

---

## 🚨 Issues Encountered & Fixes

1. **EC2 IP changed after reboot**
   - Problem: `13.205.17.214` → `13.200.4.54` broke frontend↔API connectivity
   - Fix: Updated `.env.local` with new IP and rebuilt frontend
   - Permanent fix: Allocate and attach **Elastic IP**

2. **CORS error**
   - Problem: API blocked browser requests (missing `Access-Control-Allow-Origin`)
   - Fix: Set `CORS_ORIGIN=http://13.200.4.54:3000` in API `.env`, restart PM2

3. **API 404 error (wrong base path)**
   - Problem: Frontend calling `/hr/employees` instead of `/api/v1/hr/employees`
   - Fix: Set `NEXT_PUBLIC_API_URL` to include `/api/v1` and rebuilt frontend

4. **API build missing**
   - Problem: `sak-api` crashed: `Cannot find module .../apps/api/dist/main`
   - Fix: Ran `pnpm build` in `apps/api` (compiled with SWC)

5. **EC2 froze / SSH timeout**
   - Problem: 2GB RAM insufficient for `pnpm install` + builds
   - Fix: Rebooted EC2 from AWS Console
   - Prevention: Build locally and deploy compiled artifacts (use `deploy-ec2.ps1` approach)

6. **Terminal hanging (Windows prompt)**
   - Problem: `Terminate batch job (Y/N)?` blocked commands
   - Fix: Kill terminal, open new one

---

## 📋 Deployment Checklist (Fresh Setup)

### Pre-requisites (assumed)
- Node.js 20.x installed
- pnpm installed
- PM2 installed
- Repo cloned to `/home/ubuntu/sak-erp`
- Security group ports open: `22` (SSH), `3000` (Web), `4000` (API)

### Redeploy steps
```bash
# 1) SSH
ssh -i ./saif-erp.pem ubuntu@13.200.4.54

# 2) Pull code
cd ~/sak-erp
git pull origin production-clean

# 3) Install dependencies (can be heavy on 2GB RAM)
pnpm install --frozen-lockfile

# 4) Build API
cd apps/api
pnpm build

# 5) Build Web
cd ../web
pnpm build

# 6) Configure env
# API
cd ~/sak-erp
printf "\nCORS_ORIGIN=http://13.200.4.54:3000\nPORT=4000\n" >> apps/api/.env
# Web
printf "NEXT_PUBLIC_API_URL=http://13.200.4.54:4000/api/v1\n" > apps/web/.env.local

# 7) Start/restart via PM2
cd ~/sak-erp/apps/api
pm2 start npm --name sak-api -- run start:prod

cd ~/sak-erp/apps/web
pm2 start npm --name sak-web -- start

pm2 save
pm2 list
```

### Verify
- Open HR module: http://13.200.4.54:3000/dashboard/hr
- API health (basic):
  ```bash
  curl -fsSI http://127.0.0.1:4000/api/v1 | head -n 5
  ```
- Employee list endpoint (example):
  ```bash
  curl -fsSI http://127.0.0.1:4000/api/v1/hr/employees | head -n 5
  ```

---

## 🔮 Next Steps

### Immediate
- User action: Hard-refresh (`Ctrl+Shift+R`) and test HR module
- Confirm employee data loads
- Test India compliance auto-calculations (PF/ESI/PT)

If issues persist:
- Check browser **Network** tab for the exact URL being called
- Confirm it matches: `http://13.200.4.54:4000/api/v1/hr/employees`

### Optional enhancements
- Allocate **Elastic IP** (prevents IP change on reboot)
- Add Nginx reverse proxy + custom domain
- Add SSL via Let’s Encrypt
- Re-enable DB connection (fix IPv6 issue and update API env)

---

## 🔑 Critical Security Note (Key Rotation)
A private SSH key was previously exposed in chat. Treat it as compromised.

Also: this key file was committed/tracked in git at least once, so assume it exists in repository history and/or any remote it was pushed to.

Do ASAP:
1. AWS Console → EC2 → Key Pairs → create new key pair
2. Update instance `~ubuntu/.ssh/authorized_keys` (or use "Change key pair" if applicable to your setup)
3. Remove old key access and **delete the old PEM** from all machines
4. Ensure `*.pem` is ignored and not tracked by git

After rotating:
- Purge the leaked key from git history (e.g. using `git filter-repo` or BFG), then force-push to the remote.
- Notify anyone who may have pulled the repo to re-clone.

---

## 💡 Quick Reference
- Frontend: http://13.200.4.54:3000
- API base: http://13.200.4.54:4000/api/v1
- HR page: http://13.200.4.54:3000/dashboard/hr
- Hard refresh: `Ctrl+Shift+R`
