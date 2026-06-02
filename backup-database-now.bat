@echo off
echo ==========================================
echo   SAK ERP - IMMEDIATE DATABASE BACKUP
echo ==========================================
echo.

REM Database credentials
set HOST=db.nwkaruzvzwwuftjquypk.supabase.co
set USER=postgres
set DB=postgres
set PGPASSWORD=Sak3998515253#

REM Create backup directory in QK Docs for easy Google Drive sync
set BACKUP_DIR=C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a-%%b)
set TIMESTAMP=%mydate%_%mytime%
set BACKUP_FILE=%BACKUP_DIR%\sak-erp-backup-%TIMESTAMP%.sql

echo Starting backup...
echo Host: %HOST%
echo Database: %DB%
echo Output: %BACKUP_FILE%
echo.

REM Check if pg_dump is available
where pg_dump >nul 2>nul
if %errorlevel% == 0 (
    echo Using local PostgreSQL...
    pg_dump -h %HOST% -U %USER% -d %DB% --clean --if-exists -f "%BACKUP_FILE%"
) else (
    echo PostgreSQL not found locally. Using Docker...
    docker run --rm -e PGPASSWORD=%PGPASSWORD% postgres:15-alpine pg_dump -h %HOST% -U %USER% -d %DB% --clean --if-exists --no-owner --no-privileges > "%BACKUP_FILE%"
)

if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo   BACKUP SUCCESSFUL!
    echo ==========================================
    echo.
    echo File: %BACKUP_FILE%
    for %%I in ("%BACKUP_FILE%") do echo Size: %%~zI bytes
    echo.
    echo Compressing...
    powershell -Command "Compress-Archive -Path '%BACKUP_FILE%' -DestinationPath '%BACKUP_FILE%.zip' -Force"
    del "%BACKUP_FILE%"
    echo Compressed: %BACKUP_FILE%.zip
) else (
    echo.
    echo ==========================================
    echo   BACKUP FAILED!
    echo ==========================================
    echo Check your internet connection and credentials
)

echo.
pause
