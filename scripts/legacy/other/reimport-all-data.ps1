# ============================================================================
# DELETE AND REIMPORT - Items, Vendors, and BOMs
# ============================================================================
# This script will:
# 1. Delete all items, vendors, and BOMs from the database
# 2. Reimport fresh data from Excel files
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "DELETE AND REIMPORT - Items, Vendors, and BOMs" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (!(Test-Path ".\delete-items-vendors-boms.sql")) {
    Write-Host "[ERROR] delete-items-vendors-boms.sql not found!" -ForegroundColor Red
    Write-Host "   Please run this script from the sak-erp directory" -ForegroundColor Yellow
    exit 1
}

# Check if required import files exist
$requiredFiles = @(
    ".\delete-data.js",
    ".\import-master-data.js",
    ".\import-boms.js",
    ".\master-items-processed.json",
    ".\3. Master List of Raw Material Saif Automations (1).xlsx"
)

foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Host "[ERROR] Required file not found: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[OK] All required files found" -ForegroundColor Green
Write-Host ""

# Confirmation prompt
Write-Host "[WARNING] This will DELETE ALL items, vendors, and BOMs!" -ForegroundColor Yellow
Write-Host "   Make sure you have a database backup before proceeding." -ForegroundColor Yellow
Write-Host ""
$confirmation = Read-Host "Type 'DELETE' to confirm and proceed"

if ($confirmation -ne "DELETE") {
    Write-Host "[CANCELLED] Operation cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "STEP 1: DELETING EXISTING DATA" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Executing deletion script..." -ForegroundColor Yellow
    node delete-data.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Deletion script failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "[OK] Deletion completed successfully" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Error during deletion: $_" -ForegroundColor Red
    Write-Host "   Please check the error and try again" -ForegroundColor Yellow
    exit 1
}

# Wait a moment for database to settle
Start-Sleep -Seconds 2

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "STEP 2: IMPORTING VENDORS & ITEMS" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Running import-master-data.js..." -ForegroundColor Yellow
    node import-master-data.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "Master data import failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "[OK] Vendors and items imported successfully" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Error during master data import: $_" -ForegroundColor Red
    Write-Host "   Please check the error and try again" -ForegroundColor Yellow
    exit 1
}

# Wait a moment before importing BOMs
Start-Sleep -Seconds 2

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "STEP 3: IMPORTING BOMS" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Running import-boms.js..." -ForegroundColor Yellow
    node import-boms.js
    
    if ($LASTEXITCODE -ne 0) {
        throw "BOM import failed with exit code $LASTEXITCODE"
    }
    
    Write-Host "[OK] BOMs imported successfully" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "[ERROR] Error during BOM import: $_" -ForegroundColor Red
    Write-Host "   Please check the error and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] IMPORT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  [OK] Deleted all existing items, vendors, and BOMs" -ForegroundColor Green
Write-Host "  [OK] Imported fresh vendors and items" -ForegroundColor Green
Write-Host "  [OK] Imported fresh BOMs" -ForegroundColor Green
Write-Host ""
Write-Host "Check the import log files for detailed results:" -ForegroundColor Yellow
Write-Host "  - import-log.json" -ForegroundColor Gray
Write-Host "  - bom-import-log.json" -ForegroundColor Gray
Write-Host ""
