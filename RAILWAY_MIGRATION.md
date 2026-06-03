# Railway.app Migration Guide for SAK ERP

## Overview
Migrate from Supabase to Railway for better reliability, automatic backups, and no IPv6 issues.

**Website:** https://railway.app

---

## Step 1: Create Railway Account

1. Go to: https://railway.app
2. Click **"Get Started"**
3. Sign up with GitHub or email
4. Verify your account

---

## Step 2: Create PostgreSQL Database

1. In Railway dashboard, click **"New Project"**
2. Select **"Provision PostgreSQL"**
3. Railway creates the database automatically
4. Click on the database to see connection details

**Your connection string will look like:**
```
postgresql://postgres:PASSWORD@containers-XX.railway.app:PORT/railway
```

---

## Step 3: Export Data from Supabase

### Option A: Using pgAdmin (Recommended)

1. Open **pgAdmin** on your computer
2. Connect to Supabase (the connection that works!)
3. Right-click database → **Backup**
4. Format: **Plain**
5. Save as: `sak-erp-export.sql`
6. Wait for export (database is large)

### Option B: Using psql Command (If pgAdmin works)

```bash
pg_dump -h db.nwkaruzvzwwuftjquypk.supabase.co -U postgres -d postgres --clean --if-exists > sak-erp-export.sql
```
Password: `Sak3998515253#`

---

## Step 4: Import Data to Railway

### Using Railway CLI (Recommended)

1. Install Railway CLI: https://docs.railway.app/develop/cli
2. Login: `railway login`
3. Link to project: `railway link`
4. Import:
   ```bash
   railway run psql < sak-erp-export.sql
   ```

### Using pgAdmin

1. Connect to Railway database (use connection string from Railway)
2. Right-click database → **Restore**
3. Select `sak-erp-export.sql`
4. Click **Restore**

---

## Step 5: Update Your App Connection

### For Development (.env file):

Replace:
```
# OLD (Supabase)
DATABASE_URL=postgresql://postgres:Sak3998515253#@db.nwkaruzvzwwuftjquypk.supabase.co:5432/postgres

# NEW (Railway)
DATABASE_URL=postgresql://postgres:RAILWAY_PASSWORD@containers-XX.railway.app:RAILWAY_PORT/railway
```

### For Production (Hostinger):

Update the environment variable in your hosting panel:
- Old: `db.nwkaruzvzwwuftjquypk.supabase.co`
- New: `containers-XX.railway.app`

---

## Step 6: Test Your App

1. Run your app locally:
   ```bash
   pnpm dev
   ```
2. Check if data loads correctly
3. Test a few transactions
4. If all good, deploy to production

---

## Step 7: Setup Automatic Backups

Railway **automatically backs up** every day! No setup needed.

### To Verify:
1. In Railway dashboard, click your database
2. Go to **"Backups"** tab
3. See automatic daily backups

### To Download Backup:
1. Click on any backup
2. Click **"Download"**
3. Save to: `C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups\`

---

## Step 8: Cancel Supabase (After Testing)

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **General**
4. Scroll down to **"Delete Project"**
5. Confirm deletion (after Railway is working perfectly!)

---

## Connection Details You Need

From Railway dashboard, copy these:

| Field | Value |
|-------|-------|
| Host | `containers-XX.railway.app` |
| Port | `XXXX` (usually 4-5 digits) |
| Database | `railway` |
| Username | `postgres` |
| Password | (shown in dashboard) |
| Full URL | `postgresql://postgres:PASSWORD@HOST:PORT/railway` |

---

## Cost

| Usage | Estimated Cost |
|-------|----------------|
| Small database (~1GB) | ~$3-5/month |
| Medium database (~5GB) | ~$5-10/month |
| Backups | FREE (included) |

**You get $5 free credit to start!**

---

## Troubleshooting

### Connection Failed?
- Check Railway dashboard for correct host/port
- Make sure password is copied correctly (no extra spaces)
- Try connecting with pgAdmin first to test

### Import Failed?
- Database export might be incomplete
- Try pgAdmin restore instead of CLI
- Check Railway logs for errors

### App Not Working?
- Check if DATABASE_URL is updated in all environments
- Verify database schema imported correctly
- Check Railway logs

---

## Benefits After Migration

✅ **Automatic daily backups** - No setup needed  
✅ **Works with IPv4** - No connection issues  
✅ **Better performance** - Optimized for production  
✅ **Simple dashboard** - Easy to manage  
✅ **One-click restore** - From any backup  
✅ **Discord support** - Fast responses  

---

## Let's Start!

1. Go to https://railway.app
2. Create account
3. Click "New Project" → "Provision PostgreSQL"
4. Tell me when you're on the Railway dashboard!
