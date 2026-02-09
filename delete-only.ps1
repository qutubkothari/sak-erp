# ============================================================================
# DELETE ONLY - Items, Vendors, and BOMs
# ============================================================================
# This script will ONLY delete data without reimporting
# Use reimport-all-data.ps1 for full delete + reimport workflow
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "DELETE ONLY - Items, Vendors, and BOMs" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (!(Test-Path ".\delete-items-vendors-boms.sql")) {
    Write-Host "[ERROR] delete-items-vendors-boms.sql not found!" -ForegroundColor Red
    Write-Host "   Please run this script from the sak-erp directory" -ForegroundColor Yellow
    exit 1
}

# Check if the delete script exists
if (!(Test-Path ".\delete-data.js")) {
    Write-Host "[ERROR] delete-data.js not found!" -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (!(Test-Path ".\apps\api\.env")) {
    Write-Host "[ERROR] apps\api\.env not found!" -ForegroundColor Red
    Write-Host "   Please configure your Supabase credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Required files found" -ForegroundColor Green
Write-Host ""

# Confirmation prompt
Write-Host "[WARNING] This will PERMANENTLY DELETE:" -ForegroundColor Yellow
Write-Host "   - ALL items" -ForegroundColor Red
Write-Host "   - ALL vendors" -ForegroundColor Red
Write-Host "   - ALL BOMs" -ForegroundColor Red
Write-Host "   - ALL related data (POs, PRs, GRNs, Stock Entries, etc.)" -ForegroundColor Red
Write-Host ""
Write-Host "   Make sure you have a DATABASE BACKUP before proceeding!" -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Type 'DELETE-PERMANENTLY' to confirm"

if ($confirmation -ne "DELETE-PERMANENTLY") {
    Write-Host "[CANCELLED] Operation cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "EXECUTING DELETION" -ForegroundColor Red
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Deleting all items, vendors, and BOMs..." -ForegroundColor Yellow
    Write-Host ""
    
    node delete-data.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Deletion script failed with exit code $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host "[SUCCESS] DELETION COMPLETED SUCCESSFULLY" -ForegroundColor Cyan
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "All items, vendors, and BOMs have been deleted from the database." -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Run reimport scripts to restore data:" -ForegroundColor Gray
    Write-Host "     .\reimport-all-data.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  OR manually run import scripts:" -ForegroundColor Gray
    Write-Host "     node import-master-data.js" -ForegroundColor Cyan
    Write-Host "     node import-boms.js" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "[ERROR] Error during deletion: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "  - Missing SUPABASE_URL or SUPABASE_KEY in apps\api\.env" -ForegroundColor Gray
    Write-Host "  - Network connectivity issues" -ForegroundColor Gray
    Write-Host "  - Database permissions issues" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
