# SAK ERP - Proper Development & Deployment Workflow

## ⚠️ CRITICAL RULES - NEVER BREAK THESE

### Rule 1: NEVER EDIT FILES DIRECTLY ON PRODUCTION SERVER
- ❌ DO NOT: SSH into server and edit files with vim/nano
- ✅ DO: Edit locally, commit to git, then deploy

### Rule 2: ALWAYS USE GIT
- Every change must be committed
- Every deployment must come from git
- Local and server must sync through git

### Rule 3: BEFORE ANY DEPLOYMENT
1. Commit all local changes: `git add . && git commit -m "description"`
2. Push to GitHub: `git push origin main`
3. Pull on server OR deploy from local AFTER committing

---

## 📋 Daily Development Workflow

### Step 1: Start Work (Morning)
```powershell
cd C:\Users\QK\Documents\GitHub\sak-erp
git pull origin main  # Get latest changes
npm install           # Update dependencies if needed
```

### Step 2: Make Changes
```powershell
# Edit your files in VS Code
# Test locally with: npm run dev
```

### Step 3: Commit Changes (After Each Feature/Fix)
```powershell
git status           # See what changed
git add .            # Stage all changes
git commit -m "Description of what you changed"
git push origin main # Push to GitHub
```

### Step 4: Deploy to Production
```powershell
# Option A: Deploy from local (AFTER committing!)
.\deploy-to-production.ps1

# Option B: Pull changes on server
ssh -i saif-erp.pem ubuntu@3.110.100.60
cd /home/ubuntu/sak-erp
git pull origin main
cd apps/web && npm install
pm2 restart sak-web
```

---

## 🚨 Emergency: Download Current Server Files

If you need to save current server code:
```powershell
# Create backup on server first
ssh -i saif-erp.pem ubuntu@3.110.100.60 "cd /home/ubuntu && tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz sak-erp/"

# Download entire web folder
scp -i saif-erp.pem -r ubuntu@3.110.100.60:/home/ubuntu/sak-erp/apps/web ./server-backup-web

# Compare with local
code --diff ./server-backup-web/src/app/layout.tsx ./apps/web/src/app/layout.tsx
```

---

## 🔄 Recovery: Restore from Backup

You mentioned you have a 2-day old backup. Here's how to use it:

```powershell
# 1. Download your backup to local machine
scp -i saif-erp.pem ubuntu@3.110.100.60:/path/to/backup.tar.gz ./

# 2. Extract and check contents
tar -xzf backup.tar.gz -C ./backup-extracted

# 3. Copy specific files you need
cp -r ./backup-extracted/apps/web/src/* ./apps/web/src/

# 4. Commit the restored files
git add .
git commit -m "Restored UI changes from backup"
git push origin main

# 5. Deploy
.\deploy-to-production.ps1
```

---

## 📦 Proper Deployment Script

Create this file: `deploy-to-production.ps1`
```powershell
# Check for uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "❌ ERROR: You have uncommitted changes!" -ForegroundColor Red
    Write-Host "Run: git add . && git commit -m 'your message'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ No uncommitted changes, proceeding..." -ForegroundColor Green

# Push to GitHub
git push origin main

# Deploy to server
ssh -i saif-erp.pem ubuntu@3.110.100.60 @"
cd /home/ubuntu/sak-erp
echo '📥 Pulling latest code...'
git pull origin main
echo '📦 Installing dependencies...'
cd apps/web && npm install --legacy-peer-deps
echo '🔄 Restarting services...'
pm2 restart sak-web
echo '✅ Deployment complete!'
"@

Write-Host "🚀 Deployment successful!" -ForegroundColor Green
```

---

## 🛡️ Initialize Git on Server (One-time setup)

If server doesn't have git initialized:
```bash
ssh -i saif-erp.pem ubuntu@3.110.100.60
cd /home/ubuntu/sak-erp

# Initialize git
git init
git remote add origin https://github.com/YOUR-USERNAME/sak-erp.git
git fetch origin
git reset --hard origin/main

# Set up git credentials
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## 📊 Before vs After

### ❌ OLD WAY (What Caused Data Loss):
1. SSH into server
2. Edit files with vim
3. Test at EC2 IP
4. Repeat
5. Never commit
6. Deploy from outdated local files → **DISASTER**

### ✅ NEW WAY (Safe):
1. Edit locally in VS Code
2. Test locally: `npm run dev`
3. Commit: `git add . && git commit -m "msg"`
4. Push: `git push origin main`
5. Deploy: Server pulls from git
6. Everything is backed up in git history

---

## 💡 Key Takeaways

1. **Git is your backup** - Every commit is saved forever
2. **Local = Source of Truth** - Always edit on your laptop
3. **Server = Deployment Target** - Only pulls from git, never edit there
4. **Commit often** - After every feature/fix
5. **Always check git status** before deploying

---

## 🆘 If You Accidentally Edit on Server

```bash
# On server - commit the changes
cd /home/ubuntu/sak-erp
git add .
git commit -m "Emergency commit from server"
git push origin main

# On local - pull the changes
cd C:\Users\QK\Documents\GitHub\sak-erp
git pull origin main
```

Now you're back in sync!
