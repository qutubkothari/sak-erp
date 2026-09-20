# Manual Database Backup Instructions

## Method 1: Using pgAdmin (EASIEST - Recommended)

1. **Download pgAdmin** (if not installed):
   - https://www.pgadmin.org/download/pgadmin-4-windows/
   - Install it

2. **Open pgAdmin** and connect to your database:
   - Click "Add New Server"
   - **Host**: `db.nwkaruzvzwwuftjquypk.supabase.co`
   - **Port**: `5432`
   - **Database**: `postgres`
   - **Username**: `postgres`
   - **Password**: `Sak3998515253#`

3. **Backup the database**:
   - Right-click on the database name → **Backup**
   - Format: `Plain` (SQL)
   - Encoding: `UTF8`
   - Filename: `C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups\sak-erp-backup-YYYY-MM-DD.sql`
   - Click **Backup**

4. **Compress the file**:
   - Right-click the `.sql` file → Send to → Compressed folder (zip)

---

## Method 2: Using Supabase Dashboard (Manual Export)

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to **Database** → **Backups**
4. Click **"Backup Now"** (limited to once per day on free tier)

---

## Method 3: Install PostgreSQL Command Line Tools

1. Download: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - Choose "PostgreSQL 15" → Windows x86-64
   - During install, uncheck "Stack Builder" and "pgAdmin" (optional)
   - Only need command line tools

2. After install, the `backup-database-now.bat` will work automatically

---

## Recommended Schedule

Since automated task scheduler has issues, **manually backup**:
- **Daily**: Before any major work
- **Weekly**: Every Friday evening
- **Before deployments**: Always backup first

---

## Backup Storage

Save backups to:
```
C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups\
```

Then sync `QK Docs` folder to Google Drive for cloud backup.

---

## Verify Backup is Good

1. File size should be **> 10 MB** (database is large)
2. Open `.sql` file in Notepad - should see `INSERT INTO` statements
3. Should see table names: `items`, `stock_entries`, `purchase_orders`, etc.

---

## Emergency Contact

If you need help restoring from backup, run the SQL files in Supabase SQL Editor or pgAdmin.
