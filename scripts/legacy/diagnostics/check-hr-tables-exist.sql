-- Check all HR-related tables that exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'employees', 
  'attendance_records', 
  'salary_components', 
  'leave_requests', 
  'payroll_runs', 
  'payslips'
)
ORDER BY table_name;