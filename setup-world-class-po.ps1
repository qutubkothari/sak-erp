# ============================================================================
# Setup World-Class PO Template with Letterhead
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "WORLD-CLASS PO TEMPLATE SETUP" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Paths
$downloadsPath = "$env:USERPROFILE\Downloads"
$letterheadSource = Join-Path $downloadsPath "Letter Head_260209_114851.pdf"
$assetsDir = ".\apps\api\assets"
$letterheadDest = Join-Path $assetsDir "letterhead.pdf"

# Step 1: Create assets directory
Write-Host "Step 1: Creating assets directory..." -ForegroundColor Yellow
if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
    Write-Host "[OK] Assets directory created at: $assetsDir" -ForegroundColor Green
} else {
    Write-Host "[OK] Assets directory already exists" -ForegroundColor Green
}

Write-Host ""

# Step 2: Copy letterhead
Write-Host "Step 2: Setting up letterhead..." -ForegroundColor Yellow

if (Test-Path $letterheadSource) {
    Copy-Item $letterheadSource $letterheadDest -Force
    Write-Host "[OK] Letterhead copied successfully!" -ForegroundColor Green
    Write-Host "    From: $letterheadSource" -ForegroundColor Gray
    Write-Host "    To:   $letterheadDest" -ForegroundColor Gray
} else {
    Write-Host "[WARNING] Letterhead not found in Downloads folder" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please manually copy your letterhead PDF to:" -ForegroundColor Yellow
    Write-Host "  $letterheadDest" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or place it in the current directory as 'letterhead.pdf'" -ForegroundColor Yellow
    
    # Check if letterhead exists in current directory
    if (Test-Path ".\letterhead.pdf") {
        Copy-Item ".\letterhead.pdf" $letterheadDest -Force
        Write-Host "[OK] Letterhead found in current directory and copied!" -ForegroundColor Green
    }
}

Write-Host ""

# Step 3: Verify setup
Write-Host "Step 3: Verifying setup..." -ForegroundColor Yellow

$setupComplete = $true

if (!(Test-Path $assetsDir)) {
    Write-Host "[ERROR] Assets directory not created" -ForegroundColor Red
    $setupComplete = $false
}

if (!(Test-Path $letterheadDest)) {
    Write-Host "[WARNING] Letterhead PDF not in place" -ForegroundColor Yellow
    Write-Host "          PO will use standard header template" -ForegroundColor Yellow
} else {
    $fileSize = (Get-Item $letterheadDest).Length / 1KB
    Write-Host "[OK] Letterhead PDF found (${fileSize} KB)" -ForegroundColor Green
}

# Check if service file exists
$serviceFile = ".\apps\api\src\purchase\services\world-class-po-pdf.service.ts"
if (Test-Path $serviceFile) {
    Write-Host "[OK] World-Class PO service file exists" -ForegroundColor Green
} else {
    Write-Host "[ERROR] World-Class PO service file not found!" -ForegroundColor Red
    $setupComplete = $false
}

Write-Host ""

# Summary
Write-Host "============================================================================" -ForegroundColor Cyan
if ($setupComplete) {
    Write-Host "[SUCCESS] SETUP COMPLETE!" -ForegroundColor Green
} else {
    Write-Host "[PARTIAL] SETUP INCOMPLETE - See warnings above" -ForegroundColor Yellow
}
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor White
Write-Host ""
Write-Host "1. Build the API:" -ForegroundColor Gray
Write-Host "   cd apps/api" -ForegroundColor Cyan
Write-Host "   pnpm run build" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Restart the API server:" -ForegroundColor Gray
Write-Host "   pnpm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Test the new endpoint:" -ForegroundColor Gray
Write-Host "   GET /api/purchase/orders/:id/pdf/world-class" -ForegroundColor Cyan
Write-Host ""
Write-Host "Features Included:" -ForegroundColor White
Write-Host "  [OK] Professional letterhead integration" -ForegroundColor Green
Write-Host "  [OK] GST-compliant format (HSN, CGST/SGST/IGST)" -ForegroundColor Green
Write-Host "  [OK] Comprehensive terms & conditions" -ForegroundColor Green
Write-Host "  [OK] Multi-signature authorization" -ForegroundColor Green
Write-Host "  [OK] Amount in words (Indian format)" -ForegroundColor Green
Write-Host "  [OK] Multi-page support" -ForegroundColor Green
Write-Host "  [OK] Professional color scheme" -ForegroundColor Green
Write-Host ""
Write-Host "Documentation:" -ForegroundColor White
Write-Host "  See: apps/api/src/purchase/services/README-WORLD-CLASS-PO.md" -ForegroundColor Cyan
Write-Host ""
