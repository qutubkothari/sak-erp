# ============================================================================
# Pre-Deployment Checklist for Hostinger
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "PRE-DEPLOYMENT CHECKLIST" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check 1: Letterhead exists
Write-Host "1. Checking letterhead PDF..." -ForegroundColor Yellow
$letterheadPath = "apps\api\assets\letterhead.pdf"
if (Test-Path $letterheadPath) {
    $size = [math]::Round((Get-Item $letterheadPath).Length / 1KB, 2)
    Write-Host "   [OK] Letterhead found ($size KB)" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Letterhead not found at $letterheadPath" -ForegroundColor Red
    Write-Host "   Run: .\setup-world-class-po.ps1" -ForegroundColor Yellow
    $allGood = $false
}

# Check 2: World-Class PO Service exists
Write-Host "2. Checking World-Class PO service..." -ForegroundColor Yellow
$serviceFile = "apps\api\src\purchase\services\world-class-po-pdf.service.ts"
if (Test-Path $serviceFile) {
    $lines = (Get-Content $serviceFile).Count
    Write-Host "   [OK] Service file found ($lines lines)" -ForegroundColor Green
} else {
    Write-Host "   [ERROR] Service file not found" -ForegroundColor Red
    $allGood = $false
}

# Check 3: Environment file exists
Write-Host "3. Checking API environment file..." -ForegroundColor Yellow
$envFile = "apps\api\.env"
if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "SUPABASE_URL" -and $content -match "SUPABASE_KEY") {
        Write-Host "   [OK] .env file configured" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] .env file missing required variables" -ForegroundColor Yellow
        Write-Host "   Required: SUPABASE_URL, SUPABASE_KEY, DATABASE_URL" -ForegroundColor Gray
    }
} else {
    Write-Host "   [WARNING] .env file not found (will use server environment)" -ForegroundColor Yellow
}

# Check 4: SSH Key exists
Write-Host "4. Checking SSH key..." -ForegroundColor Yellow
$keyPaths = @(
    "$env:USERPROFILE\.ssh\hostinger_ed25519",
    "$env:USERPROFILE\.ssh\id_ed25519",
    "$env:USERPROFILE\.ssh\id_rsa"
)
$keyFound = $false
foreach ($keyPath in $keyPaths) {
    if (Test-Path $keyPath) {
        Write-Host "   [OK] SSH key found: $keyPath" -ForegroundColor Green
        $keyFound = $true
        break
    }
}
if (-not $keyFound) {
    Write-Host "   [ERROR] No SSH key found. Checked:" -ForegroundColor Red
    foreach ($path in $keyPaths) {
        Write-Host "   - $path" -ForegroundColor Gray
    }
    Write-Host "   Generate one with: ssh-keygen -t ed25519 -f ~/.ssh/hostinger_ed25519" -ForegroundColor Yellow
    $allGood = $false
}

# Check 5: Dependencies installed
Write-Host "5. Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   [OK] node_modules exists" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] node_modules not found. Will install during deployment." -ForegroundColor Yellow
}

# Check 6: Git status
Write-Host "6. Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ([string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-Host "   [OK] Working directory clean" -ForegroundColor Green
} else {
    $uncommitted = ($gitStatus | Measure-Object).Count
    Write-Host "   [INFO] $uncommitted uncommitted changes" -ForegroundColor Cyan
    Write-Host "   Uncommitted files will be deployed as-is" -ForegroundColor Gray
}

# Check 7: Hostinger connectivity
Write-Host "7. Checking Hostinger connectivity..." -ForegroundColor Yellow
$hostingerIp = if ($env:HOSTINGER_IP) { $env:HOSTINGER_IP } else { "72.62.192.228" }
$hostingerUser = if ($env:HOSTINGER_USER) { $env:HOSTINGER_USER } else { "qutubk" }

try {
    $ping = Test-Connection -ComputerName $hostingerIp -Count 1 -Quiet -ErrorAction SilentlyContinue
    if ($ping) {
        Write-Host "   [OK] Server reachable at $hostingerIp" -ForegroundColor Green
    } else {
        Write-Host "   [WARNING] Cannot ping $hostingerIp (may be blocked)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [WARNING] Connectivity check failed" -ForegroundColor Yellow
}

# Check 8: Required commands
Write-Host "8. Checking required commands..." -ForegroundColor Yellow
$commands = @("pnpm", "git", "ssh", "scp", "tar")
$missingCommands = @()
foreach ($cmd in $commands) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "   [OK] $cmd" -ForegroundColor Green
    } else {
        Write-Host "   [ERROR] $cmd not found" -ForegroundColor Red
        $missingCommands += $cmd
        $allGood = $false
    }
}

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host "ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ready to deploy to Hostinger!" -ForegroundColor White
    Write-Host ""
    Write-Host "Deployment will:" -ForegroundColor White
    Write-Host "  1. Build API with world-class PO service" -ForegroundColor Gray
    Write-Host "  2. Build Next.js web application" -ForegroundColor Gray
    Write-Host "  3. Package assets including letterhead PDF" -ForegroundColor Gray
    Write-Host "  4. Upload to Hostinger VPS ($hostingerIp)" -ForegroundColor Gray
    Write-Host "  5. Install dependencies on server" -ForegroundColor Gray
    Write-Host "  6. Restart PM2 processes" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To deploy, run:" -ForegroundColor White
    Write-Host "  .\deploy-github-and-hostinger.ps1 -CommitMessage 'Deploy world-class PO feature'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or skip Git:" -ForegroundColor White
    Write-Host "  .\deploy-hostinger.ps1" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "DEPLOYMENT BLOCKED - FIX ERRORS ABOVE" -ForegroundColor Red
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
