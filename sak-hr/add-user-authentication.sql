-- Add User table for authentication
CREATE TABLE IF NOT EXISTS "User" (
  "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "role" VARCHAR(50) NOT NULL DEFAULT 'employee',
  "employeeId" VARCHAR(255) UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_employeeId_idx" ON "User"("employeeId");

-- Insert demo users with hashed passwords
-- admin@sakhr.com / admin123
-- manager@sakhr.com / manager123
-- employee@sakhr.com / employee123

-- Note: Passwords are hashed with bcrypt, cost factor 10
INSERT INTO "User" ("id", "email", "password", "role", "employeeId") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@sakhr.com', '$2b$10$CLG504CpXr9rSFzFwFN/IOip8O70VR2v9Ott2v5VfOYst1AUuShou', 'admin', NULL),
('550e8400-e29b-41d4-a716-446655440002', 'manager@sakhr.com', '$2b$10$iLmKjQnN9HGWCchtN7uWsuKBOjQu.jJ0rPdkGmbb1M0z54.6uIs.O', 'manager', NULL),
('550e8400-e29b-41d4-a716-446655440003', 'employee@sakhr.com', '$2b$10$mmXTQq3ojGSgnZs0roPJLO7gT/g0Uz/00QyPkC3nwG6yhtDPRhcza', 'employee', NULL)
ON CONFLICT (email) DO NOTHING;

-- Update trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
