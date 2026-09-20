@echo off
echo ==========================================
echo   INSTALL POSTGRESQL CLIENT TOOLS
echo ==========================================
echo.
echo This will download and install only the
echo PostgreSQL command line tools needed
echo for automatic database backups.
echo.
echo NO PostgreSQL server will be installed.
echo.
pause

echo.
echo Step 1: Downloading PostgreSQL 15...
echo.

REM Create temp directory
set TEMP_DIR=%TEMP%\postgresql-install
if not exist "%TEMP_DIR%" mkdir "%TEMP_DIR%"

REM Download PostgreSQL installer
echo Downloading from EnterpriseDB...
powershell -Command "Invoke-WebRequest -Uri 'https://sbp.enterprisedb.com/getfile.jsp?fileid=1258892' -OutFile '%TEMP_DIR%\postgresql-15.4-1-windows-x64.exe'"

if not exist "%TEMP_DIR%\postgresql-15.4-1-windows-x64.exe" (
    echo.
    echo ERROR: Download failed!
    echo.
    echo Please download manually from:
    echo https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
    echo.
    pause
    exit /b 1
)

echo.
echo Step 2: Installing PostgreSQL (Command Line Tools Only)...
echo.
echo This will open the installer. Please follow these steps:
echo.
echo 1. Click "Next" on welcome screen
echo 2. Keep default install location
echo 3. UNCHECK these components (we don't need them):
echo    - [ ] PostgreSQL Server
echo    - [ ] pgAdmin 4
echo    - [ ] Stack Builder
echo 4. CHECK only:
echo    - [x] Command Line Tools
echo 5. Click "Next" and "Install"
echo.
pause

REM Run the installer
start /wait "%TEMP_DIR%\postgresql-15.4-1-windows-x64.exe"

echo.
echo ==========================================
echo   INSTALLATION COMPLETE!
echo ==========================================
echo.
echo PostgreSQL command line tools are now installed.
echo.
echo Testing backup script...
echo.

REM Test if pg_dump is now available
where pg_dump >nul 2>nul
if %errorlevel% == 0 (
    echo SUCCESS! pg_dump is now available.
    echo.
    echo Running test backup...
    echo.
    call "C:\Users\QK\Documents\GitHub\sak-erp\backup-database-now.bat"
) else (
    echo WARNING: pg_dump not found in PATH.
    echo You may need to restart your computer.
    echo.
    echo After restart, run backup-database-now.bat to test.
)

echo.
pause
