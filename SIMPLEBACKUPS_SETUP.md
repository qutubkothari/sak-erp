# SimpleBackups Setup Guide for SAK ERP

## What is SimpleBackups?
SimpleBackups is a cloud service that connects to your Supabase database and automatically backs it up daily/hourly to Google Drive, S3, Dropbox, etc.

**Website:** https://simplebackups.com

---

## Pricing

| Plan | Cost | Backups | Storage |
|------|------|---------|---------|
| **Free** | $0 | 1 per day | Connect your own storage |
| Starter | $9/mo | 5 per day | Included |
| Pro | $29/mo | Unlimited | Included |

**Recommendation:** Start with **Free** - it backs up once daily which is sufficient.

---

## Setup Steps

### Step 1: Create Account
1. Go to https://simplebackups.com
2. Click **"Get Started Free"**
3. Sign up with your email
4. Verify email

### Step 2: Add Your Database
1. Click **"Add Resource"** → **"Database"**
2. Select **"PostgreSQL"**
3. Enter these connection details:

| Field | Value |
|-------|-------|
| **Name** | SAK-ERP-Supabase |
| **Host** | db.nwkaruzvzwwuftjquypk.supabase.co |
| **Port** | 5432 |
| **Database** | postgres |
| **Username** | postgres |
| **Password** | Sak3998515253# |
| **SSL Mode** | require |

4. Click **"Test Connection"** - should show green checkmark
5. Click **"Save"**

### Step 3: Add Storage (Google Drive)
1. Click **"Add Storage"** → **"Google Drive"**
2. Connect your Google account
3. Select folder: `QK Docs/SAK-ERP-Backups/`
4. Click **"Save"**

### Step 4: Create Backup Job
1. Click **"Create Backup"**
2. Select your database: **SAK-ERP-Supabase**
3. Select storage: **Google Drive**
4. Set schedule: **Daily at 2:00 AM**
5. Set retention: Keep **30 days** of backups
6. Click **"Create Backup"**

---

## Connection String (For Reference)

```
postgresql://postgres:Sak3998515253#@db.nwkaruzvzwwuftjquypk.supabase.co:5432/postgres?sslmode=require
```

---

## What Happens Next?

✅ Every day at 2:00 AM, SimpleBackups will:
1. Connect to your Supabase database
2. Create a full SQL backup
3. Save it to your Google Drive
4. Send you an email notification (success/failure)

---

## Monitoring

- **Dashboard:** https://simplebackups.com/dashboard
- **Email alerts:** Enabled by default
- **Backup history:** View all past backups
- **Restore:** One-click restore from any backup

---

## Troubleshooting

### Connection Failed?
- Check password: `Sak3998515253#`
- Enable SSL: Set SSL Mode to "require"
- Check if Supabase project is active (not paused)

### Backup Failed?
- Check SimpleBackups dashboard for error logs
- Verify Google Drive still has space
- Check if Supabase is accessible

### Want More Frequent Backups?
- Upgrade to Starter ($9/month) for hourly backups
- Or keep Free plan with daily backups

---

## Alternative: Use AWS S3 Instead

If you don't want to use Google Drive:

1. Create AWS account: https://aws.amazon.com
2. Create S3 bucket: `sak-erp-backups`
3. In SimpleBackups, select **"Amazon S3"** as storage
4. Enter AWS credentials
5. 5 GB storage is free on AWS (free tier)

---

## Security Notes

- SimpleBackups encrypts your credentials
- Backups are encrypted in transit and at rest
- You control where backups are stored (your Google Drive)
- No third party can access your data

---

## Questions?

Contact SimpleBackups support: support@simplebackups.com

Or check their docs: https://simplebackups.com/docs
