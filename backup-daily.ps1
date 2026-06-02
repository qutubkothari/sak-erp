# =====================================================
# SAK ERP - Daily Database Backup (PowerShell)
# Resolves IP via Google DNS, then backs up database
# =====================================================

# Database credentials
$DBHost = "db.nwkaruzvzwwuftjquypk.supabase.co"
$DBUser = "postgres"
$DBName = "postgres"
$DBPassword = "Sak3998515253#"
$DBPort = "5432"

# Backup directory
$BackupDir = "C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Generate timestamp
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupFile = "$BackupDir\sak-erp-backup-$Timestamp.sql"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SAK ERP - DATABASE BACKUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Resolve IP using Google DNS (bypass Windows DNS issues)
Write-Host "Resolving IP via Google DNS (8.8.8.8)..." -ForegroundColor Yellow
try {
    $ResolvedIP = (Resolve-DnsName -Name $DBHost -Server 8.8.8.8 -Type A -ErrorAction Stop | Select-Object -First 1).IPAddress
    Write-Host "Resolved IP: $ResolvedIP" -ForegroundColor Green
} catch {
    Write-Host "Failed to resolve IP via Google DNS" -ForegroundColor Red
    Write-Host "Using hostname directly..." -ForegroundColor Yellow
    $ResolvedIP = $DBHost
}

# Step 2: Find pg_dump
Write-Host ""
Write-Host "Looking for pg_dump..." -ForegroundColor Yellow

$pgDumpPaths = @(
    "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
    "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
    "pg_dump"
)

$pgDumpPath = $null
foreach ($path in $pgDumpPaths) {
    if (Test-Path $path) {
        $pgDumpPath = $path
        break
    }
}

if (-not $pgDumpPath) {
    # Try to find in PATH
    $pgDumpPath = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
}

if (-not $pgDumpPath) {
    Write-Host "ERROR: pg_dump not found!" -ForegroundColor Red
    Write-Host "Please install PostgreSQL command line tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found pg_dump at: $pgDumpPath" -ForegroundColor Green

# Step 3: Run backup
Write-Host ""
Write-Host "Starting backup..." -ForegroundColor Yellow
Write-Host "Host: $ResolvedIP" -ForegroundColor White
Write-Host "Database: $DBName" -ForegroundColor White
Write-Host "Output: $BackupFile" -ForegroundColor White
Write-Host ""

$env:PGPASSWORD = $DBPassword

$arguments = @(
    "-h", $ResolvedIP,
    "-p", $DBPort,
    "-U", $DBUser,
    "-d", $DBName,
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "-f", $BackupFile
)

try {
    & $pgDumpPath @arguments
    
    if (Test-Path $BackupFile) {
        $fileSize = (Get-Item $BackupFile).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "  BACKUP SUCCESSFUL!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "File: $BackupFile" -ForegroundColor White
        Write-Host "Size: $fileSizeMB MB" -ForegroundColor White
        
        # Compress
        Write-Host ""
        Write-Host "Compressing..." -ForegroundColor Yellow
        $zipFile = "$BackupFile.zip"
        Compress-Archive -Path $BackupFile -DestinationPath $zipFile -Force
        Remove-Item $BackupFile
        
        Write-Host "Compressed: $zipFile" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next step: Sync QK Docs folder to Google Drive" -ForegroundColor Cyan
    } else {
        throw "Backup file was not created"
    }
} catch {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "  BACKUP FAILED!" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Backup completed at $(Get-Date)" -ForegroundColor Gray
