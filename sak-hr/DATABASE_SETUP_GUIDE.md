# 🔧 Initial Database Setup Guide

## Problem
The system is returning errors like:
- ❌ "Employee profile not linked to user"
- ❌ Cannot add Employees
- ❌ Cannot create Goals

## Root Cause
The database needs to be populated with:
1. **Departments** (HR, IT, Finance, etc.)
2. **Roles** (Manager, Developer, etc.)
3. **Employees** (linked to user accounts)

---

## ✅ Quick Setup (5 minutes)

### Step 1: SSH into Hostinger Server
```bash
ssh -i ~/.ssh/hostinger_ed25519 qutubk@72.62.192.228
```

### Step 2: Run the Setup Script
```bash
# Connect to database
docker exec -it sak-hr-postgres psql -U sak_hr -d sak_hr

# Inside psql, run the setup script
\i /var/www/sak-hr/sak-hr/seed-initial-data.sql

# Verify data was created
SELECT COUNT(*) as departments FROM "Department";
SELECT COUNT(*) as roles FROM "Role";
SELECT COUNT(*) as employees FROM "Employee";

# Check user-employee linking
SELECT u.email, e."firstName", e."lastName", e.code 
FROM "User" u 
LEFT JOIN "Employee" e ON u."employeeId" = e.id;

# Exit psql
\q
```

---

## 📊 What Gets Created

### Departments (6)
- Human Resources
- Information Technology
- Finance
- Marketing
- Operations
- Sales

### Roles (8)
- Senior Manager
- Manager
- Team Lead
- Senior Developer
- Developer
- Analyst
- Coordinator
- Executive

### Employees (3) - Linked to Users
| Email | Name | Department | Role | Manager |
|-------|------|-----------|------|---------|
| admin@sakhr.com | Admin User | Human Resources | Senior Manager | None |
| manager@sakhr.com | Manager User | Information Technology | Manager | Admin User |
| employee@sakhr.com | Test Employee | Information Technology | Developer | Manager User |

---

## 🚀 After Setup - What You Can Do

### As Admin User (admin@sakhr.com)
✅ Access all features  
✅ Create Goals  
✅ Complete Self-Assessment  
✅ View all employees  
✅ Add more departments, roles, employees  

### As Manager User (manager@sakhr.com)
✅ Conduct manager reviews  
✅ Create Goals  
✅ View team members  

### As Employee User (employee@sakhr.com)
✅ Create Goals  
✅ Complete Self-Assessment  
✅ Request 360 Feedback  
✅ View personal data  

---

## 🛠️ Where to Add More Data in the UI

### Add More Departments
1. Navigate to: **Performance > Criteria > Departments** (if available)
2. Or: **Performance > Employees & Managers > Add Department**
3. Or: Use SQL script directly

### Add More Roles
1. Navigate to: **Performance > Criteria > Roles** (if available)
2. Or: Use SQL script to add via `seed-initial-data.sql`

### Add More Employees
1. Navigate to: **Performance > Employees & Managers**
2. Click: **"Add New Employee"**
3. Fill in:
   - First Name, Last Name
   - Email
   - Department (dropdown)
   - Job Role (dropdown)
   - Reporting Manager (dropdown)
   - Hire Date
4. Click: **"Save Employee"**

### Link Existing Users to Employees
After creating an employee, link them to a user account:

**Via SQL:**
```sql
UPDATE "User"
SET "employeeId" = (SELECT id FROM "Employee" WHERE email = 'newemp@sakhr.com')
WHERE email = 'newemp@sakhr.com';
```

**Or create user + employee together:**
```sql
-- 1. Create user first
INSERT INTO "User" (id, email, password, role, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'john@sakhr.com', '[bcrypt-hash]', 'employee', NOW(), NOW());

-- 2. Create employee
INSERT INTO "Employee" (id, code, "firstName", "lastName", email, "departmentId", "roleId", "employmentType", status, "hireDate", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'EMP004', 'John', 'Doe', 'john@sakhr.com', d.id, r.id, 'FULL_TIME', 'ACTIVE', NOW(), NOW(), NOW()
FROM "Department" d, "Role" r
WHERE d.name = 'Information Technology' AND r.title = 'Developer';

-- 3. Link user to employee
UPDATE "User"
SET "employeeId" = (SELECT id FROM "Employee" WHERE email = 'john@sakhr.com')
WHERE email = 'john@sakhr.com';
```

---

## 📝 Manual SQL for Custom Data

If you want to create custom data manually:

```sql
-- Add a new department
INSERT INTO "Department" (id, name, "createdAt") VALUES 
  (gen_random_uuid(), 'Engineering', NOW());

-- Add a new role
INSERT INTO "Role" (id, title, "createdAt") VALUES 
  (gen_random_uuid(), 'Senior Engineer', NOW());

-- Add a new employee
INSERT INTO "Employee" (id, code, "firstName", "lastName", email, "departmentId", "roleId", "employmentType", status, "hireDate", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'EMP005', 'John', 'Smith', 'john.smith@sakhr.com', d.id, r.id, 'FULL_TIME', 'ACTIVE', NOW(), NOW(), NOW()
FROM "Department" d, "Role" r
WHERE d.name = 'Engineering' AND r.title = 'Senior Engineer';

-- Create user for employee
INSERT INTO "User" (id, email, password, role, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'john.smith@sakhr.com', '[bcrypt-hash]', 'employee', NOW(), NOW());

-- Link user to employee
UPDATE "User"
SET "employeeId" = (SELECT id FROM "Employee" WHERE email = 'john.smith@sakhr.com')
WHERE email = 'john.smith@sakhr.com';
```

---

## 🔄 Next Steps

### Immediate (After Running Script)
1. ✅ Run `seed-initial-data.sql` on Hostinger
2. ✅ Verify users are linked to employees
3. ✅ Test login with all 3 users
4. ✅ Try creating a goal as each user

### Short Term
- Add your real employees to the system
- Set up proper manager hierarchies
- Create additional departments and roles

### Medium Term
- Create review cycles
- Set up competencies and KPIs
- Configure rating scales
- Start performance evaluations

---

## 🚨 Troubleshooting

### Still Getting "Employee profile not linked to user"
```bash
# Check if employee exists
docker exec -it sak-hr-postgres psql -U sak_hr -d sak_hr -c "SELECT * FROM \"Employee\" WHERE email = 'admin@sakhr.com';"

# Check if user-employee link exists
docker exec -it sak-hr-postgres psql -U sak_hr -d sak_hr -c "SELECT * FROM \"User\" WHERE email = 'admin@sakhr.com';"

# If employee exists but link doesn't, run:
docker exec -it sak-hr-postgres psql -U sak_hr -d sak_hr -c "UPDATE \"User\" SET \"employeeId\" = (SELECT id FROM \"Employee\" WHERE email = 'admin@sakhr.com') WHERE email = 'admin@sakhr.com';"
```

### Cannot Find Department/Role Dropdowns
- Ensure `seed-initial-data.sql` completed successfully
- Verify departments and roles exist in database:
```bash
docker exec -it sak-hr-postgres psql -U sak_hr -d sak_hr -c "SELECT * FROM \"Department\";"
docker exec -it sak-hr-postgres psql -U sak_hr -d sak_hr -c "SELECT * FROM \"Role\";"
```

---

## 📞 Support

If you encounter issues:
1. Check the logs: `pm2 logs sak-hr`
2. Verify database connection: Check `.env` file for `DATABASE_URL`
3. Restart app: `pm2 restart sak-hr`
4. Re-run seed script if needed

---

**Setup Time:** ~5 minutes  
**Status:** Ready to use immediately after setup! ✅
