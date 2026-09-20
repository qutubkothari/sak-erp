@echo off
echo ==========================================
echo   ADD SUPABASE TO HOSTS FILE
echo ==========================================
echo.
echo This adds the Supabase database IP to your
echo Windows hosts file so DNS works properly.
echo.
echo YOU MUST RUN THIS AS ADMINISTRATOR!
echo Right-click -^> Run as Administrator
echo.
pause

echo.
echo Creating backup of current hosts file...
copy C:\Windows\System32\drivers\etc\hosts C:\Windows\System32\drivers\etc\hosts.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2% >nul 2>&1

echo.
echo Adding Supabase entry to hosts file...
echo. >> C:\Windows\System32\drivers\etc\hosts
echo # SAK ERP Supabase Database >> C:\Windows\System32\drivers\etc\hosts
echo 2406:da18:243:7416:91b6:60bf:46c5:2b7a db.nwkaruzvzwwuftjquypk.supabase.co >> C:\Windows\System32\drivers\etc\hosts

echo.
echo Flushing DNS cache...
ipconfig /flushdns >nul

echo.
echo ==========================================
echo   SUCCESS!
echo ==========================================
echo.
echo Supabase host entry added.
echo You can now run backup-database-now.bat
echo.
echo Hosts file location:
echo C:\Windows\System32\drivers\etc\hosts
echo.
echo To remove this entry later, edit the hosts file
echo and delete the lines starting with "2406:da18..."
echo.
pause
