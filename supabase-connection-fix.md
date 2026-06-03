# Supabase Connection Fix for SimpleBackups

## Issue: Cannot Connect to Supabase

Error ED380 usually means:
1. Wrong credentials
2. IP not whitelisted in Supabase
3. SSL mode incorrect
4. IPv6/IPv4 issue

---

## Fix 1: Use Connection String (Recommended)

Instead of "Manual" tab, click **"Connection String"** tab and paste:

```
postgresql://postgres:Sak3998515253#@db.nwkaruzvzwwuftjquypk.supabase.co:5432/postgres?sslmode=require
```

---

## Fix 2: Whitelist SimpleBackups IPs in Supabase

SimpleBackups needs its IP addresses allowed in Supabase:

1. Go to: https://supabase.com/dashboard/project/nwkaruzvzwwuftjquypk/settings/database
2. Under **"Network Restrictions"** or **"Database"**
3. Add these IPs to allowed list:
   - 18.208.123.167
   - 54.88.225.228
   - 54.208.184.152
   - 3.227.224.0/20 (SimpleBackups range)

Or simpler: **Temporarily allow all IPs** (0.0.0.0/0) to test, then restrict later.

---

## Fix 3: Try Different SSL Mode

In "Certificate / TLS" dropdown, try these in order:
1. **"require"** (most common)
2. **"verify-ca"**
3. **"verify-full"**

---

## Fix 4: Check Supabase Project Status

1. Go to: https://supabase.com/dashboard
2. Make sure your project shows as **"Active"** (not paused)
3. If paused, click **"Restore"**

---

## Fix 5: Alternative - Use pgAdmin on Your Computer

Since SimpleBackups has connection issues, use **pgAgent** in pgAdmin:

1. Open pgAdmin on your computer
2. Go to **" pgAgent Jobs"** (in the browser tree)
3. Create a new job:
   - Name: "Daily SAK Backup"
   - Schedule: Every day at 2:00 AM
   - Steps: Run pg_dump command
   - Save to: `C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups\`

This runs on YOUR computer, not in the cloud, so no IP whitelisting needed.

---

## Quick Test: Is Supabase Accessible?

Open Command Prompt and run:
```bash
psql "postgresql://postgres:Sak3998515253#@db.nwkaruzvzwwuftjquypk.supabase.co:5432/postgres?sslmode=require" -c "SELECT version();"
```

If this works, the credentials are correct.
If it fails, check Supabase dashboard for connection settings.

---

## Recommended Solution

Since we've had DNS issues all day:

**Use pgAdmin pgAgent instead** - it's already on your computer, works with Supabase, and doesn't need SimpleBackups.

Steps:
1. Open pgAdmin
2. Go to pgAgent → Jobs
3. Create daily backup job
4. Saves to your QK Docs folder automatically

**Want me to write a guide for pgAdmin automated backup?**
