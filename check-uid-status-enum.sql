-- Check valid uid_status enum values
SELECT 
    enumlabel as valid_status_values
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'uid_status'
)
ORDER BY enumsortorder;
