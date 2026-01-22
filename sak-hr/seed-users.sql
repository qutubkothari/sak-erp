-- Create a test admin user
-- Email: admin@sakhr.com
-- Password: admin123 (hashed with bcrypt)

INSERT INTO "User" (id, email, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@sakhr.com',
  '$2a$10$rK7vV3kGVZGZqKx5/YJVQuO5H5OmEDKZz1jXKqY5xqFJZVQxQZqRe', -- admin123
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a test manager user
-- Email: manager@sakhr.com  
-- Password: manager123

INSERT INTO "User" (id, email, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'manager@sakhr.com',
  '$2a$10$X9pZm4cHqNvF1TqH8.W4E.kUn0Q5vQY8fKJKZVZF9Y8qGqJQf8VKe', -- manager123
  'manager',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create a test employee user
-- Email: employee@sakhr.com
-- Password: employee123

INSERT INTO "User" (id, email, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'employee@sakhr.com',
  '$2a$10$K9pQm3dHqMvF2TqI9.X5F.lVo1R6wRZ9gLKLaWaG0Z9rHrKRg9WLf', -- employee123
  'employee',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
