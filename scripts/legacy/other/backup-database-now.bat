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

REM Try to resolve IP address using Google DNS (workaround for DNS issues)
echo Resolving host IP using Google DNS...
set HOST_IP=
for /f "tokens=* skip=4" %%a in ('nslookup -type=A %HOST% 8.8.8.8 2^>nul') do (
    if not defined HOST_IP (
        for /f "tokens=2 delims=: " %%b in ("%%a") do (
            set HOST_IP=%%b
            goto :gotip
        )
    )
)
:gotip

if defined HOST_IP (
    echo Found IP: %HOST_IP%
    echo Using IP address directly to bypass DNS...
    set HOST=%HOST_IP%
) else (
    echo Warning: Could not resolve IP, trying hostname anyway...
)

REM Check if pg_dump is available (search common locations)
set PGDUMP_FOUND=0
set PGDUMP_PATH=

REM Check if in PATH
where pg_dump >nul 2>nul
if %errorlevel% == 0 (
    set PGDUMP_FOUND=1
    for /f "tokens=*" %%a in ('where pg_dump') do set PGDUMP_PATH=%%a
)

REM Check common PostgreSQL installation locations
if %PGDUMP_FOUND% == 0 (
    if exist "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" (
        set PGDUMP_PATH=C:\Program Files\PostgreSQL\15\bin\pg_dump.exe
        set PGDUMP_FOUND=1
    )
)

if %PGDUMP_FOUND% == 0 (
    if exist "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe" (
        set PGDUMP_PATH=C:\Program Files\PostgreSQL\14\bin\pg_dump.exe
        set PGDUMP_FOUND=1
    )
)

if %PGDUMP_FOUND% == 0 (
    if exist "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" (
        set PGDUMP_PATH=C:\Program Files\PostgreSQL\16\bin\pg_dump.exe
        set PGDUMP_FOUND=1
    )
)

if %PGDUMP_FOUND% == 1 (
    echo Found PostgreSQL at: %PGDUMP_PATH%
    "%PGDUMP_PATH%" -h %HOST% -U %USER% -d %DB% --clean --if-exists --no-owner --no-privileges -f "%BACKUP_FILE%"
) else (
    echo PostgreSQL not found. Checking if you installed it...
    echo.
    echo Please install PostgreSQL command line tools:
    echo 1. Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
    echo 2. Run installer
    echo 3. Select ONLY "Command Line Tools" (uncheck Server, pgAdmin, StackBuilder)
    echo.
    pause
    exit /b 1
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
