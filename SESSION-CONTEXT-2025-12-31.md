# Manufacturing ERP — Session Context (December 31, 2025)

This file is the handoff/context so work can continue on this machine without needing prior chat history.

**Workspace root used for this context:** `C:\Users\QK\Documents\GitHub\sak-erp`

## 🚨 ACTIVE STATUS (CURRENT - Dec 31, 2025)

### EC2 Production Server: **3.110.100.60**
- ✅ **API (port 4000)**: Running via PM2 (`sak-api`) - 14h uptime
- ✅ **Web (port 3000)**: Running via PM2 (`sak-web`) - **JUST DEPLOYED & ONLINE**

### Recent Work Deployed to EC2
1. **Items Price Import Fix**: Enhanced `normalizeNumber()` helper to strip currency symbols (₹,$,€) and commas
2. **BOM Subassembly Inference**: Logic to auto-detect and explode subassemblies in BOMs/Job Orders

### Immediate Priorities
1. Deploy/fix Web (port 3000) - currently stopped
2. Test item price import with currency symbols
3. Test BOM subassembly display and Smart Job Orders

Detailed context from previous session: [SESSION-CONTEXT-2024-12-30-PREVIOUS-MACHINE.md](SESSION-CONTEXT-2024-12-30-PREVIOUS-MACHINE.md)

## ✅ Current Ground Truth (This Repo)

### Repo + Branch
- Repo: `qutubkothari/sak-erp`
- Branch: `main`
- Status (on this machine): clean working tree, remote in sync
- Git object store: packed, ~210 MiB packfile (no multi‑GiB history issue visible here)

### Monorepo Structure
- `apps/api`: NestJS API
- `apps/web`: Next.js 14 (App Router)
- `packages/database`: Prisma client/migrations tooling
- Root tooling: `pnpm-workspace.yaml`, `turbo.json`

### Production Deployment (Canonical)
- Canonical docs: [deploy/CURRENT_DEPLOYMENT_GUIDE.md](deploy/CURRENT_DEPLOYMENT_GUIDE.md)
- PM2 config: [ecosystem.config.js](ecosystem.config.js)

**ACTUAL EC2 IP (Production):** `3.110.100.60`

**Note:** This repo's deploy docs currently reference `13.205.17.214` (legacy). The actual production server is at `3.110.100.60`.

To update deployment scripts for the correct IP, replace `13.205.17.214` with `3.110.100.60` in:
- [deploy/CURRENT_DEPLOYMENT_GUIDE.md](deploy/CURRENT_DEPLOYMENT_GUIDE.md)
- [DEPLOY_NOW.md](DEPLOY_NOW.md)
- [deploy-production.ps1](deploy-production.ps1)
- [deploy-now.ps1](deploy-now.ps1)
- [ecosystem.config.js](ecosystem.config.js) (if it contains hardcoded IPs)

**Important:** Web runs in **dev mode** on production by design (t2.micro RAM constraints). API runs in production mode.

## 🚀 Deployment Summary (Current)

### Web (NO build)
- Runs: `pm2` process `sak-web`
- Command: `npm run dev`
- Rationale: Next.js production build fails on t2.micro (documented)

### API (WITH build)
- Runs: `pm2` process `sak-api`
- Command: `npm run start:prod`
- Deploy requires: `npm run build` before restarting

## 🧭 Historical IPs Found in Repo (Likely Legacy)

Multiple IPs exist in older docs/scripts; do not assume they are current:
- `13.205.17.214` — **current** (deploy/CURRENT_DEPLOYMENT_GUIDE.md, DEPLOY_NOW.md)
- `35.154.55.38` — appears in older deployment summaries/testing guides
- `15.206.164.166` — appears in older EC2 setup templates (e.g. deploy/ec2-setup.sh)

If you see conflicting IPs in a file, treat [deploy/CURRENT_DEPLOYMENT_GUIDE.md](deploy/CURRENT_DEPLOYMENT_GUIDE.md) as the source of truth.

## ✅ Key Implementation Notes (Relevant Areas)

### 1) Item Import / Pricing Parsing
- Service: [apps/api/src/items/services/items.service.ts](apps/api/src/items/services/items.service.ts)
- There is a `normalizeNumber()` helper used in some paths, but in the current code it is essentially `parseFloat`/`parseInt` and **does not** strip currency symbols or commas.
- **Caution:** `bulkCreate()` still uses `parseFloat(...)` directly for `standard_cost`/`selling_price`, which will *not* handle values like `₹1,234.50` correctly.

If price import problems reappear, this is the first place to revisit.

### 2) Multi‑Level BOMs / Subassemblies
- BOM links are represented via `bom_items.component_type`:
  - `ITEM` uses `bom_items.item_id`
  - `BOM` uses `bom_items.child_bom_id`
- Service: [apps/api/src/bom/services/bom.service.ts](apps/api/src/bom/services/bom.service.ts)
- Explosion logic (for planning) also exists in production services (see `component_type`, `child_bom_id` usage).

**Data migration / one-off fix script found:**
- [apps/api/fix-bom.js](apps/api/fix-bom.js) — converts a specific component from ITEM → BOM by setting `child_bom_id` and nulling `item_id`.

## 🧪 Quick “Smoke Check” Commands (Local)

From repo root:
- Install: `pnpm install`
- Dev: `pnpm dev`

If you want to run apps separately:
- API: `cd apps/api; pnpm dev`
- Web: `cd apps/web; pnpm dev`

## 📌 What’s Needed From You (To Continue Precisely)

Reply with:
1) Which environment you’re targeting right now (local vs EC2), and
2) The exact feature/bug you want to continue (module + expected behavior).

---

### Reference: Older Session Context File
You provided a historical handoff file named `SESSION-CONTEXT-2024-12-30.md` (from another machine). Some details in it (notably EC2 IP and deployment model) differ from the current repo’s deployment docs.

Notably, that older context references EC2 `3.110.100.60`, but that IP does not appear anywhere in this repo’s current deployment docs. If `3.110.100.60` is still your active server, you’ll want to replace the IP in the files listed above.

## 🔐 Security Note (Action Needed)

This repo currently contains a private key file `saif-erp.pem` at the repo root, and it is tracked by git.

Recommended actions:
1) Remove it from the repository and history if possible.
2) Rotate/replace the EC2 key pair (treat the existing key as compromised).
