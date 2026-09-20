@echo off
echo ==========================================
echo   ADD SUPABASE HOST TO HOSTS FILE
echo ==========================================
echo.
echo This will add the Supabase IP to your hosts file
echo so the backup works without DNS.
echo.
echo YOU MUST RUN THIS AS ADMINISTRATOR!
echo.
pause

echo.
echo Getting IP address from Google DNS...
echo.

REM Get the IP address
set SUPABASE_IP=
for /f "tokens=*" %%a in ('powershell -Command "(Resolve-DnsName -Name db.nwkaruzvzwwuftjquypk.supabase.co -Server 8.8.8.8 -Type A | Select-Object -First 1).IPAddress" 2^>nul') do set SUPABASE_IP=%%a

if not defined SUPABASE_IP (
    echo Could not get IP automatically.
    echo.
    set /p SUPABASE_IP="Enter the IP address manually (check with your phone's internet): "
)

echo.
echo IP Address: %SUPABASE_IP%
echo.

REM Add to hosts file
echo Adding entry to hosts file...
echo %SUPABASE_IP% db.nwkaruzvzwwuftjquypk.supabase.co >> C:\Windows\System32\drivers\etc\hosts

echo.
echo Flushing DNS cache...
ipconfig /flushdns

echo.
echo ==========================================
echo   DONE!
echo ==========================================
echo.
echo Host entry added. Try running backup now.
echo.
echo To remove later, edit:
echo C:\Windows\System32\drivers\etc\hosts
echo.
pause
