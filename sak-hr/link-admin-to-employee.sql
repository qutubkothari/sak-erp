-- Link admin user to admin employee

-- First, get the admin employee ID
DO $$
DECLARE
  admin_employee_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get admin employee ID (the one with email admin@sakhr.com)
  SELECT id INTO admin_employee_id 
  FROM "Employee" 
  WHERE email = 'admin@sakhr.com' 
  LIMIT 1;

  -- Get admin user ID
  SELECT id INTO admin_user_id 
  FROM "User" 
  WHERE email = 'admin@sakhr.com' 
  LIMIT 1;

  -- Update user to link to employee
  IF admin_employee_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
    UPDATE "User" 
    SET "employeeId" = admin_employee_id 
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin user linked to employee successfully';
  ELSE
    RAISE NOTICE 'Admin user or employee not found';
  END IF;
END $$;

-- Verify the linkage
SELECT u.email as user_email, u."employeeId", e."firstName", e."lastName", e.email as employee_email
FROM "User" u
LEFT JOIN "Employee" e ON u."employeeId" = e.id
WHERE u.email = 'admin@sakhr.com';
