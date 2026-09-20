-- Create admin employee and link to user

DO $$
DECLARE
  admin_employee_id UUID;
  admin_user_id TEXT;
  admin_dept_id UUID;
  admin_role_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM "User" 
  WHERE email = 'admin@sakhr.com' 
  LIMIT 1;

  -- Get HR department ID (or create it)
  SELECT id INTO admin_dept_id 
  FROM "Department" 
  WHERE name = 'Administration' 
  LIMIT 1;

  IF admin_dept_id IS NULL THEN
    INSERT INTO "Department" (id, name, "createdAt")
    VALUES (gen_random_uuid(), 'Administration', NOW())
    RETURNING id INTO admin_dept_id;
  END IF;

  -- Get Admin role ID (or create it)
  SELECT id INTO admin_role_id 
  FROM "Role" 
  WHERE title = 'System Administrator' 
  LIMIT 1;

  IF admin_role_id IS NULL THEN
    INSERT INTO "Role" (id, title, "createdAt")
    VALUES (gen_random_uuid(), 'System Administrator', NOW())
    RETURNING id INTO admin_role_id;
  END IF;

  -- Create admin employee if doesn't exist
  SELECT id INTO admin_employee_id 
  FROM "Employee" 
  WHERE email = 'admin@sakhr.com' 
  LIMIT 1;

  IF admin_employee_id IS NULL THEN
    INSERT INTO "Employee" (id, code, "firstName", "lastName", email, "departmentId", "roleId", "hireDate", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(), 
      'EMP001', 
      'System', 
      'Administrator', 
      'admin@sakhr.com',
      admin_dept_id,
      admin_role_id,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO admin_employee_id;
    RAISE NOTICE 'Admin employee created';
  END IF;

  -- Link user to employee
  IF admin_user_id IS NOT NULL AND admin_employee_id IS NOT NULL THEN
    UPDATE "User" 
    SET "employeeId" = admin_employee_id::TEXT
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin user linked to employee successfully';
  END IF;
END $$;

-- Verify the linkage
SELECT u.email as user_email, u.role as user_role, e.code, e."firstName", e."lastName", d.name as department, r.title as job_title
FROM "User" u
LEFT JOIN "Employee" e ON u."employeeId" = e.id
LEFT JOIN "Department" d ON e."departmentId" = d.id
LEFT JOIN "Role" r ON e."roleId" = r.id
WHERE u.email = 'admin@sakhr.com';
