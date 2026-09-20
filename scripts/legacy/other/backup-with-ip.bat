@echo off
echo ==========================================
echo   SAK ERP - DATABASE BACKUP (IP MODE)
echo ==========================================
echo.
echo Using direct IP to bypass DNS issues
echo.

REM Database credentials - USING IP ADDRESS DIRECTLY
REM IP for db.nwkaruzvzwwuftjquypk.supabase.co (retrieved via Google DNS)
set HOST=2406:da18:243:7416:91b6:60bf:46c5:2b7a
set USER=postgres
set DB=postgres
set PGPASSWORD=Sak3998515253#

REM Create backup directory
set BACKUP_DIR=C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a-%%b)
set TIMESTAMP=%mydate%_%mytime%
set BACKUP_FILE=%BACKUP_DIR%\sak-erp-backup-%TIMESTAMP%.sql

echo Starting backup using IPv6 address...
echo Host: %HOST%
echo Database: %DB%
echo Output: %BACKUP_FILE%
echo.

REM Check if pg_dump is available
set PGDUMP_PATH=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe

if not exist "%PGDUMP_PATH%" (
    echo ERROR: pg_dump not found at %PGDUMP_PATH%
    pause
    exit /b 1
)

echo Found PostgreSQL at: %PGDUMP_PATH%
echo.

REM Run backup with IP address
echo Running backup (this may take a few minutes)...
"%PGDUMP_PATH%" -h "%HOST%" -U %USER% -d %DB% --clean --if-exists --no-owner --no-privileges -f "%BACKUP_FILE%"

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
    echo.
    echo Next step: Copy to Google Drive for cloud backup
) else (
    echo.
    echo ==========================================
    echo   BACKUP FAILED!
    echo ==========================================
    echo.
    echo Possible causes:
    echo 1. Internet connection issue
    echo 2. Supabase project is paused
    echo 3. Firewall blocking connection
    echo.
    echo Try using pgAdmin instead:
    echo 1. Open pgAdmin
    echo 2. Right-click database -^> Backup
    echo 3. Save to: %BACKUP_DIR%
)

echo.
pause
