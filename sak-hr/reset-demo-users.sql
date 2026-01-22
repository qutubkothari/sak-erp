-- Delete existing users and insert demo users
DELETE FROM "User";

-- Insert demo users with hashed passwords
INSERT INTO "User" ("id", "email", "password", "role", "employeeId", "createdAt", "updatedAt") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@sakhr.com', '$2b$10$CLG504CpXr9rSFzFwFN/IOip8O70VR2v9Ott2v5VfOYst1AUuShou', 'admin', NULL, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'manager@sakhr.com', '$2b$10$iLmKjQnN9HGWCchtN7uWsuKBOjQu.jJ0rPdkGmbb1M0z54.6uIs.O', 'manager', NULL, NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'employee@sakhr.com', '$2b$10$mmXTQq3ojGSgnZs0roPJLO7gT/g0Uz/00QyPkC3nwG6yhtDPRhcza', 'employee', NULL, NOW(), NOW());

-- Verify
SELECT email, role FROM "User";
