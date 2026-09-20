@echo off
echo ==========================================
echo   SETUP WINDOWS AUTOMATED BACKUP
echo ==========================================
echo.
echo This will schedule daily database backups
echo at 2:00 AM every day on your computer.
echo.
pause

REM Create the scheduled task
echo.
echo Creating scheduled task...
echo.

schtasks /create /tn "SAK-ERP-Daily-Backup" /tr "C:\Users\QK\Documents\GitHub\sak-erp\backup-database-now.bat" /sc daily /st 02:00 /f /ru "%USERNAME%" /rp "*"

if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo   SUCCESS! Daily backup scheduled!
    echo ==========================================
    echo.
    echo Backup will run every day at 2:00 AM
    echo Backup location: C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups\
    echo.
    echo To verify or change:
    echo 1. Open Task Scheduler (taskschd.msc)
    echo 2. Look for "SAK-ERP-Daily-Backup"
    echo.
) else (
    echo.
    echo ==========================================
    echo   ERROR creating task
    echo ==========================================
    echo Run as Administrator and try again
    echo.
)

pause
