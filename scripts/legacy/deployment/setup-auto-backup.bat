@echo off
echo ==========================================
echo   SETUP AUTOMATED DAILY BACKUP
echo ==========================================
echo.
echo This will schedule daily backups at 2:00 AM
echo using PowerShell (which properly resolves DNS)
echo.
echo Run this as Administrator!
echo.
pause

echo.
echo Creating scheduled task...
echo.

REM Create task to run PowerShell script daily at 2:00 AM
schtasks /create /tn "SAK-ERP-Auto-Backup" /tr "powershell.exe -ExecutionPolicy Bypass -File \"C:\Users\QK\Documents\GitHub\sak-erp\backup-daily.ps1\"" /sc daily /st 02:00 /f /ru "%USERNAME%"

if %errorlevel% == 0 (
    echo.
    echo ==========================================
    echo   SUCCESS! Auto-backup scheduled!
    echo ==========================================
    echo.
    echo Schedule: Every day at 2:00 AM
    echo Backup location: C:\Users\QK\Documents\QK Docs\SAK-ERP-Backups\
    echo.
    echo Test it now by running: run-backup.bat
    echo.
    echo To check status:
    echo   - Open Task Scheduler (taskschd.msc)
    echo   - Look for "SAK-ERP-Auto-Backup"
    echo.
) else (
    echo.
    echo ==========================================
    echo   ERROR: Run as Administrator!
    echo ==========================================
    echo.
    echo Right-click this file and select
    echo "Run as Administrator"
    echo.
)

pause
