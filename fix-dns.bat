@echo off
echo ==========================================
echo   FIX DNS ISSUE FOR SUPABASE BACKUP
echo ==========================================
echo.
echo This will flush DNS cache and check connection.
echo.
pause

echo.
echo Step 1: Flushing DNS cache...
echo.
ipconfig /flushdns
echo.

echo Step 2: Getting IP address of Supabase host...
echo.
nslookup db.nwkaruzvzwwuftjquypk.supabase.co

echo.
echo Step 3: Testing with Google DNS...
echo.
echo Trying to ping via Google DNS...
ping -4 db.nwkaruzvzwwuftjquypk.supabase.co

echo.
echo ==========================================
echo If ping still fails, try these fixes:
echo ==========================================
echo.
echo 1. Change DNS to Google (8.8.8.8):
echo    - Settings ^> Network ^> Change adapter options
echo    - Right-click your network ^> Properties
echo    - IPv4 ^> Properties ^> Use: 8.8.8.8 and 8.8.4.4
echo.
echo 2. Check Windows Firewall:
echo    - Search 'Windows Defender Firewall'
echo    - Click 'Allow an app'
echo    - Allow pg_dump through
echo.
echo 3. Try different internet connection (mobile hotspot)
echo.
echo 4. Use Supabase Dashboard backup instead (works always)
echo.
pause
