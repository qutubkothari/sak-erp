@echo off
echo Starting SAK ERP Database Backup...
echo.

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File "C:\Users\QK\Documents\GitHub\sak-erp\backup-daily.ps1"

echo.
pause
