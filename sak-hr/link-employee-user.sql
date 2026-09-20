-- Link employee user to employee profile by email
UPDATE "User" u
SET "employeeId" = e.id
FROM "Employee" e
WHERE u.email = 'employee@sakhr.com'
  AND e.email = 'employee@sakhr.com';

-- Verify linkage
SELECT u.email as user_email, u."employeeId", e.code, e."firstName", e."lastName"
FROM "User" u
LEFT JOIN "Employee" e ON u."employeeId" = e.id
WHERE u.email = 'employee@sakhr.com';
