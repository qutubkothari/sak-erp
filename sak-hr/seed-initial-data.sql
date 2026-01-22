-- ============================================
-- SAK HR - Initial Data Setup
-- ============================================
-- This script populates the database with:
-- 1. Departments
-- 2. Roles
-- 3. Employees
-- 4. Link Employees to Users
-- ============================================

-- ============================================
-- 1. CREATE DEPARTMENTS
-- ============================================
INSERT INTO "Department" (id, name, "createdAt") VALUES
  (gen_random_uuid(), 'Human Resources', NOW()),
  (gen_random_uuid(), 'Information Technology', NOW()),
  (gen_random_uuid(), 'Finance', NOW()),
  (gen_random_uuid(), 'Marketing', NOW()),
  (gen_random_uuid(), 'Operations', NOW()),
  (gen_random_uuid(), 'Sales', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. CREATE ROLES
-- ============================================
INSERT INTO "Role" (id, title, "createdAt") VALUES
  (gen_random_uuid(), 'Senior Manager', NOW()),
  (gen_random_uuid(), 'Manager', NOW()),
  (gen_random_uuid(), 'Team Lead', NOW()),
  (gen_random_uuid(), 'Senior Developer', NOW()),
  (gen_random_uuid(), 'Developer', NOW()),
  (gen_random_uuid(), 'Analyst', NOW()),
  (gen_random_uuid(), 'Coordinator', NOW()),
  (gen_random_uuid(), 'Executive', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. CREATE EMPLOYEES & LINK TO USERS
-- ============================================

-- Admin Employee (linked to admin@sakhr.com user)
INSERT INTO "Employee" (
  id, code, "firstName", "lastName", email, 
  "departmentId", "roleId", "managerId",
  "employmentType", status, "hireDate", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  'EMP001',
  'Admin',
  'User',
  'admin@sakhr.com',
  d.id,
  r.id,
  NULL,
  'FULL_TIME',
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
FROM "Department" d, "Role" r
WHERE d.name = 'Human Resources' AND r.title = 'Senior Manager'
ON CONFLICT (email) DO NOTHING;

-- Manager Employee (linked to manager@sakhr.com user)
INSERT INTO "Employee" (
  id, code, "firstName", "lastName", email, 
  "departmentId", "roleId", "managerId",
  "employmentType", status, "hireDate", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  'EMP002',
  'Manager',
  'User',
  'manager@sakhr.com',
  d.id,
  r.id,
  e.id,
  'FULL_TIME',
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
FROM "Department" d, "Role" r, "Employee" e
WHERE d.name = 'Information Technology' 
  AND r.title = 'Manager'
  AND e.email = 'admin@sakhr.com'
ON CONFLICT (email) DO NOTHING;

-- Employee (linked to employee@sakhr.com user)
INSERT INTO "Employee" (
  id, code, "firstName", "lastName", email, 
  "departmentId", "roleId", "managerId",
  "employmentType", status, "hireDate", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  'EMP003',
  'Test',
  'Employee',
  'employee@sakhr.com',
  d.id,
  r.id,
  e.id,
  'FULL_TIME',
  'ACTIVE',
  NOW(),
  NOW(),
  NOW()
FROM "Department" d, "Role" r, "Employee" e
WHERE d.name = 'Information Technology' 
  AND r.title = 'Developer'
  AND e.email = 'manager@sakhr.com'
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 4. LINK USERS TO EMPLOYEES
-- ============================================
UPDATE "User"
SET "employeeId" = (SELECT id FROM "Employee" WHERE email = 'admin@sakhr.com')
WHERE email = 'admin@sakhr.com';

UPDATE "User"
SET "employeeId" = (SELECT id FROM "Employee" WHERE email = 'manager@sakhr.com')
WHERE email = 'manager@sakhr.com';

UPDATE "User"
SET "employeeId" = (SELECT id FROM "Employee" WHERE email = 'employee@sakhr.com')
WHERE email = 'employee@sakhr.com';

-- ============================================
-- 5. VERIFY DATA
-- ============================================
-- Run these SELECT statements to verify:
-- SELECT COUNT(*) as total_departments FROM "Department";
-- SELECT COUNT(*) as total_roles FROM "Role";
-- SELECT COUNT(*) as total_employees FROM "Employee";
-- SELECT u.email, e."firstName", e."lastName", e.code FROM "User" u LEFT JOIN "Employee" e ON u."employeeId" = e.id;
