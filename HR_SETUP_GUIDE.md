# 🚀 HR Tables Setup Guide

## The Problem
You're getting: `ERROR: 42703: column "tenant_id" does not exist`

This happens because:
1. The `tenants` table doesn't exist in your database, OR
2. The `tenants` table exists but has a different structure than expected

## ✅ Solution

### Option 1: Manual Execution (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor** (left sidebar)
   - Click **New Query**

2. **Copy & Paste the Fixed SQL**
   - Open `create-hr-tables-fixed.sql` 
   - Copy ALL content
   - Paste into Supabase SQL Editor

3. **Execute**
   - Click **Run** button
   - You should see success messages

### Option 2: Via API Call

If you prefer to use the API, use this approach:

```bash
# Using curl (replace YOUR_SERVICE_ROLE_KEY with actual key)
curl -X POST 'https://your-project-ref.supabase.co/rest/v1/rpc/exec_sql' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql": "YOUR_SQL_CONTENT_HERE"}'
```

### Option 3: Update Original Script

Replace your current `create-hr-tables.sql` with the content from `create-hr-tables-fixed.sql`.

## 🔍 What the Fixed Script Does

1. **Creates tenants table** if it doesn't exist
2. **Inserts default tenant** for testing
3. **Creates all HR tables** with proper foreign key constraints
4. **Adds indexes** for performance
5. **Includes verification queries** to confirm success

## ✅ Verification

After running the script, you should see:
- ✅ All 6 HR tables created (employees, attendance_records, leave_requests, etc.)
- ✅ Sample employee record inserted
- ✅ Table verification showing column counts
- ✅ Record counts for all tables

## 📋 Next Steps

Once the tables are created successfully, you can:
1. Test the HR module in your application
2. Add more employees through the API
3. Customize the employee fields as needed
4. Set up attendance tracking
5. Configure payroll components

## 🐛 If You Still Get Errors

If you still encounter issues:
1. Check if you have the correct database permissions
2. Verify you're connected to the right Supabase project
3. Check if there are any conflicting table names
4. Share the exact error message for further debugging

---

**File to use:** `create-hr-tables-fixed.sql`  
**Status:** Ready to execute ✅