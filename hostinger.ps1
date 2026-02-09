# Hostinger Quick Actions
param([string]$Action = 'help')

$IP = "72.62.192.228"
$USER = "qutubk"
$KEY = "$env:USERPROFILE\.ssh\hostinger_ed25519"

function SSH($cmd) { ssh -o StrictHostKeyChecking=no -i $KEY "$USER@$IP" $cmd }

Write-Host "`n=== HOSTINGER QUICK ACTIONS ===`n" -ForegroundColor Cyan

switch ($Action) {
    'status' {
        Write-Host "PM2 Status:`n" -ForegroundColor Yellow
        SSH "pm2 status"
    }
    'logs' {
        Write-Host "API Logs:`n" -ForegroundColor Yellow
        SSH "pm2 logs sak-api --lines 20 --nostream"
        Write-Host "`nWeb Logs:`n" -ForegroundColor Yellow
        SSH "pm2 logs sak-web --lines 20 --nostream"
    }
    'restart' {
        Write-Host "Restarting...`n" -ForegroundColor Yellow
        SSH "pm2 restart sak-api sak-web"
        Start-Sleep 2
        SSH "pm2 status"
    }
    'deploy' {
        .\deploy-hostinger.ps1
    }
    'ssh' {
        Write-Host "Connecting to $USER@$IP`n" -ForegroundColor Yellow
        ssh -i $KEY "$USER@$IP"
    }
    'test' {
        Write-Host "Testing applications:`n" -ForegroundColor Yellow
        $web = try { Invoke-WebRequest "http://${IP}:3000" -TimeoutSec 5 -UseBasicParsing; "OK" } catch { "FAIL" }
        $api = try { Invoke-WebRequest "http://${IP}:4000/api/v1" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue; "OK" } catch { if ($_.Exception.Response.StatusCode -eq 404) { "OK (404)" } else { "FAIL" } }
        Write-Host "Frontend: $web" -ForegroundColor $(if($web -eq "OK"){"Green"}else{"Red"})
        Write-Host "API:      $api" -ForegroundColor $(if($api -like "OK*"){"Green"}else{"Red"})
        Write-Host "`nURLs:"
        Write-Host "  http://${IP}:3000"
        Write-Host "  http://${IP}:4000/api/v1"
    }
    default {
        Write-Host "Available Actions:"
        Write-Host "  status   - Check PM2 status"
        Write-Host "  logs     - View logs"
        Write-Host "  restart  - Restart services"
        Write-Host "  deploy   - Deploy to Hostinger"
        Write-Host "  ssh      - SSH to server"
        Write-Host "  test     - Test endpoints"
        Write-Host "`nUsage: .\hostinger.ps1 <action>"
        Write-Host "Example: .\hostinger.ps1 status"
    }
}
Write-Host ""
