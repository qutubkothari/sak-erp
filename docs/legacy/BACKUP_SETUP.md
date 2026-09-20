# FREE Database Backup Solutions (No Paid Supabase Required)

## Option 1: Manual Backup via Supabase Dashboard (Easiest)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Database** → **Backups**
4. Click **Backup Now** (free, but limited frequency on Free tier)

---

## Option 2: Automated Local Backups (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed (free)

### Setup
1. Get your database credentials:
   - Supabase Dashboard → Settings → Database
   - Connection string: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

2. Edit `backup/backup-database.ps1`:
   ```powershell
   $SUPABASE_HOST = "db.your-project-ref.supabase.co"
   $SUPABASE_PASSWORD = "your-db-password"
   ```

3. Run manually:
   ```powershell
   .\backup\backup-database.ps1
   ```

4. **Automate with Windows Task Scheduler** (daily/weekly)

---

## Option 3: GitHub Actions Automated Backup (FREE)

### Setup (One-time)
1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

2. Add these secrets:
   - `SUPABASE_HOST`: `db.your-project-ref.supabase.co`
   - `SUPABASE_PASSWORD`: Your database password

3. That's it! Backups will:
   - Run automatically **daily at midnight UTC**
   - Be saved as **GitHub Releases** (free storage)
   - Keep history indefinitely

4. Manual backup anytime:
   - GitHub → Actions → Database Backup → **Run workflow**

---

## Option 4: pgAdmin (GUI Tool)
1. Download [pgAdmin](https://www.pgadmin.org/download/)
2. Connect to your Supabase database
3. Right-click database → **Backup**
4. Save `.backup` or `.sql` file locally

---

## Restore from Backup

### Using psql (command line):
```bash
psql -h db.your-project-ref.supabase.co -U postgres -d postgres < backup-file.sql
```

### Using pgAdmin:
1. Connect to database
2. Right-click → **Restore**
3. Select backup file

---

## What Gets Backed Up?
✅ All tables (items, POs, GRNs, stock, users, etc.)  
✅ All data rows  
✅ Functions and triggers  
❌ Files in Storage (separate backup needed)  
❌ Edge Functions code (in GitHub already)

---

## Storage Costs on GitHub
- **Free tier**: Unlimited public repos, 500MB private releases
- **Pro tier**: 2GB releases
- Backups compressed: ~10-50MB each

---

## Recommendation
Use **Option 3 (GitHub Actions)** - completely free, automated, no local setup needed!
