-- Create employee profile for employee@sakhr.com if missing and link to user
DO $$
DECLARE
  emp_id UUID;
BEGIN
  SELECT id INTO emp_id FROM "Employee" WHERE email = 'employee@sakhr.com' LIMIT 1;
  IF emp_id IS NULL THEN
    INSERT INTO "Employee" (id, code, "firstName", "lastName", email, "hireDate", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      'EMP003',
      'Default',
      'Employee',
      'employee@sakhr.com',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO emp_id;
  END IF;

  UPDATE "User" u
  SET "employeeId" = emp_id::TEXT
  WHERE u.email = 'employee@sakhr.com';
END $$;

SELECT u.email as user_email, u."employeeId", e.code, e."firstName", e."lastName"
FROM "User" u
LEFT JOIN "Employee" e ON u."employeeId" = e.id
WHERE u.email = 'employee@sakhr.com';
