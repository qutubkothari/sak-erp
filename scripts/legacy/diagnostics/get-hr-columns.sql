-- Get exact column structures for HR tables
SELECT 'SALARY_COMPONENTS TABLE:' as table_info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'salary_components' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'EMPLOYEES TABLE:' as table_info;  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'employees' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'ATTENDANCE_RECORDS TABLE:' as table_info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'attendance_records' AND table_schema = 'public'  
ORDER BY ordinal_position;