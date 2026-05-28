# ============================================================================
# SYNC LIVE DB → TEST DB using pg_dump + pg_restore
# Run this in PowerShell
# Replace the connection strings with your actual Supabase credentials
# Find them in: Supabase Dashboard → Project Settings → Database → Connection string
# ============================================================================

# LIVE DB connection string (get from Supabase live project settings)
$LIVE_DB = "postgresql://postgres:[PASSWORD]@db.[LIVE-PROJECT-REF].supabase.co:5432/postgres"

# TEST DB connection string (get from Supabase test project settings)
$TEST_DB = "postgresql://postgres:[PASSWORD]@db.[TEST-PROJECT-REF].supabase.co:5432/postgres"

$DUMP_FILE = "$PSScriptRoot\live-backup.dump"

Write-Host "Step 1: Dumping LIVE database..." -ForegroundColor Cyan
pg_dump --format=custom --no-owner --no-acl "$LIVE_DB" -f "$DUMP_FILE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump failed. Make sure pg_dump is installed (comes with PostgreSQL)." -ForegroundColor Red
    exit 1
}

Write-Host "Dump complete: $DUMP_FILE" -ForegroundColor Green

Write-Host "Step 2: Restoring to TEST database..." -ForegroundColor Cyan
pg_restore --clean --no-owner --no-acl -d "$TEST_DB" "$DUMP_FILE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Some restore errors are normal (e.g. existing objects). Check output above." -ForegroundColor Yellow
} else {
    Write-Host "Restore complete!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done! Test DB should now mirror Live DB." -ForegroundColor Green
