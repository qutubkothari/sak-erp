# 🧹 Quick Data Cleanup Instructions

## When to Use This
- Before starting fresh testing cycle
- After demo/presentation
- To reset system to clean state
- When you need to clear all sample data

---

## ⚡ Quick Steps (2 minutes)

### Step 1: Copy SQL Script
1. **Open file**: `database/CLEANUP_ALL_DATA.sql`
2. **Press**: `Ctrl+A` (Select All)
3. **Press**: `Ctrl+C` (Copy)

### Step 2: Run in Supabase
1. **Go to**: https://supabase.com/dashboard
2. **Login** with your credentials
3. **Select Project**: `nwkaruzvzwwuftjquypk`
4. **Click**: SQL Editor (left sidebar)
5. **Click**: "+ New Query" button
6. **Press**: `Ctrl+V` (Paste the SQL)
7. **Click**: "RUN" button (or press `Ctrl+Enter`)
8. **Wait**: 10-30 seconds for completion

### Step 3: Verify Cleanup
**Scroll to bottom of SQL results**, you should see:

```
table_name              remaining_records
production_orders       0
purchase_orders         0
sales_orders            0
grn                     0
uid_registry            0
bom                     0
items                   0
vendors                 0
customers               0
```

**✅ All should show 0 records**

---

## ⚠️ IMPORTANT NOTES

**What Gets Deleted:**
- ✅ All purchase orders, GRNs, invoices
- ✅ All production orders and assemblies
- ✅ All sales orders and deliveries
- ✅ All UIDs and tracking data
- ✅ All BOMs (Bill of Materials)
- ✅ All items (products/materials)
- ✅ All vendors and customers
- ✅ All quality records, defects, repairs
- ✅ All documents and revisions

**What is Preserved:**
- ✅ User accounts (admin login still works)
- ✅ Tenant configuration
- ✅ System settings
- ✅ Database structure (tables, indexes)
- ✅ Application code

**Cannot Be Undone:**
- ❌ This permanently deletes data
- ❌ No backup/restore capability in script
- ❌ Use only in testing environments

---

## 🔄 After Cleanup

**System is now ready for:**
1. Fresh testing cycle (follow CLIENT_TESTING_GUIDE.md)
2. Client demo with new data
3. Training session
4. UAT (User Acceptance Testing)

**What to do next:**
- Follow Phase 2 of testing guide (Master Data Setup)
- Create vendors, items, customers
- Start procurement flow
- Test production and traceability

---

## 🆘 If Something Goes Wrong

**Problem**: SQL gives errors

**Solution**:
- Check if you're connected to correct database
- Verify you have admin access
- Try running sections one at a time
- Contact dev team with error message

**Problem**: Verification shows records remaining

**Solution**:
- Some system records may remain (normal)
- Check if records belong to different tenant
- If > 10 records remain, run cleanup again

**Problem**: Can't login after cleanup

**Solution**:
- User accounts are NOT deleted
- Use same credentials: admin@sakerp.com / Admin@123
- Clear browser cache if login fails
- Check if API server is running

---

## 📋 Cleanup Checklist

Before running cleanup:
- [ ] Confirm this is TEST environment
- [ ] Backup important data (if any)
- [ ] Note current record counts
- [ ] Close all browser tabs with app open
- [ ] Inform team members

After running cleanup:
- [ ] Verify all tables show 0 records
- [ ] Test login still works
- [ ] Refresh application in browser
- [ ] Start fresh testing from Phase 2

---

## 🎯 Pro Tips

1. **Save SQL as Bookmark**: Keep the Supabase SQL Editor open in a tab
2. **Create Shortcut**: Bookmark the cleanup file location
3. **Quick Verification**: After cleanup, just check Items count - if 0, everything is clean
4. **Multiple Rounds**: Safe to run multiple times - won't harm structure
5. **Pre-Demo Routine**: Always cleanup 10 minutes before client demo

---

## 📞 Need Help?

**File Location**: `database/CLEANUP_ALL_DATA.sql`  
**Testing Guide**: `docs/CLIENT_TESTING_GUIDE.md`  
**Supabase Dashboard**: https://supabase.com/dashboard

**Support**: Contact development team if:
- Errors occur during cleanup
- Verification shows issues
- System behaves unexpectedly after cleanup

---

**Last Updated**: November 29, 2025  
**Version**: 1.0.0
