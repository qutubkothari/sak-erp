# 🚀 QUICK FIX - Run This Now!

## Issue
Getting error: **"Employee profile not linked to user"** when trying to create goals

## Solution (5 minutes)

### Copy and run this command in your terminal:

```bash
# SSH into Hostinger
ssh -i ~/.ssh/hostinger_ed25519 qutubk@72.62.192.228

# Run the database setup script
docker exec -it sak-hr-postgres psql -U sak_hr -d sak_hr -f /var/www/sak-hr/sak-hr/seed-initial-data.sql
```

### Expected Output:
```
INSERT 0 1
INSERT 0 1
...
(no errors)
```

---

## ✅ What This Does

Creates:
- ✅ 6 Departments (HR, IT, Finance, Marketing, Operations, Sales)
- ✅ 8 Roles (Manager, Developer, Analyst, etc.)
- ✅ 3 Employees linked to your users:
  - admin@sakhr.com → Admin User (HR Manager)
  - manager@sakhr.com → Manager User (IT Manager)
  - employee@sakhr.com → Test Employee (Developer)

---

## 🎯 After Running Script

1. Refresh your browser: http://72.62.192.228:8060
2. Login: admin@sakhr.com / admin123
3. Go to: **Performance > Goals**
4. Click: **Create New Goal** ✅ Should work now!

---

## 📝 If You Need to Add More Employees Later

See [DATABASE_SETUP_GUIDE.md](DATABASE_SETUP_GUIDE.md) for:
- How to add employees via UI
- How to add custom departments/roles
- SQL queries for manual data entry

---

**Time:** 2 minutes ⏱️  
**Status:** Go live immediately after! 🚀
