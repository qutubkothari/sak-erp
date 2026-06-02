# =====================================================
# FREE Database Backup Script for Supabase
# Run this daily/weekly to backup your database locally
# =====================================================

# Configuration - Get these from Supabase Dashboard > Settings > Database
$SUPABASE_HOST = "your-project-ref.supabase.co"  # e.g., abc123def456.supabase.co
$SUPABASE_DB = "postgres"
$SUPABASE_USER = "postgres"
$SUPABASE_PASSWORD = "your-database-password"  # NOT the anon key - the DB password

# Backup settings
$BACKUP_DIR = "$PSScriptRoot\backups"
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BACKUP_FILE = "$BACKUP_DIR\sak-erp-backup-$DATE.sql"

# Create backup directory if not exists
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
}

Write-Host "Starting database backup..." -ForegroundColor Green
Write-Host "Backup file: $BACKUP_FILE" -ForegroundColor Yellow

# Run pg_dump (requires PostgreSQL installed locally, or use Docker)
try {
    # Option 1: If you have PostgreSQL installed locally
    # pg_dump -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB -f $BACKUP_FILE --clean --if-exists

    # Option 2: Using Docker (no local PostgreSQL needed)
    docker run --rm -e PGPASSWORD=$SUPABASE_PASSWORD postgres:15-alpine `
        pg_dump -h $SUPABASE_HOST -U $SUPABASE_USER -d $SUPABASE_DB `
        --clean --if-exists --verbose `
        > $BACKUP_FILE

    if ($LASTEXITCODE -eq 0) {
        # Compress the backup
        Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.zip" -Force
        Remove-Item $BACKUP_FILE

        # Keep only last 30 backups (delete old ones)
        Get-ChildItem $BACKUP_DIR -Filter "*.zip" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -Skip 30 | 
            Remove-Item -Force

        Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host "📦 File: $BACKUP_FILE.zip" -ForegroundColor Cyan
        Write-Host "📊 Size: $((Get-Item "$BACKUP_FILE.zip").Length / 1MB) MB" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Backup failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
