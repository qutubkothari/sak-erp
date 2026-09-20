# Test DNS resolution
Write-Host "Testing DNS resolution..." -ForegroundColor Cyan

# Test 1: Standard resolution
Write-Host "`n1. Standard DNS resolution:" -ForegroundColor Yellow
$standard = Resolve-DnsName -Name "db.nwkaruzvzwwuftjquypk.supabase.co" -ErrorAction SilentlyContinue
$standard | Format-Table Name, Type, IPAddress

# Test 2: Google DNS A records
Write-Host "`n2. Google DNS (A records only):" -ForegroundColor Yellow
$googleA = Resolve-DnsName -Name "db.nwkaruzvzwwuftjquypk.supabase.co" -Server 8.8.8.8 -Type A -ErrorAction SilentlyContinue
$googleA | Format-Table Name, Type, IPAddress

# Test 3: Cloudflare DNS
Write-Host "`n3. Cloudflare DNS (A records):" -ForegroundColor Yellow
$cloudflare = Resolve-DnsName -Name "db.nwkaruzvzwwuftjquypk.supabase.co" -Server 1.1.1.1 -Type A -ErrorAction SilentlyContinue
$cloudflare | Format-Table Name, Type, IPAddress

# Test 4: IPv4 from Google
Write-Host "`n4. IPv4 from Google DNS:" -ForegroundColor Yellow
try {
    $ipv4 = Resolve-DnsName -Name "db.nwkaruzvzwwuftjquypk.supabase.co" -Server 8.8.8.8 -Type A | Where-Object { $_.Type -eq 'A' } | Select-Object -First 1
    if ($ipv4.IPAddress) {
        Write-Host "IPv4: $($ipv4.IPAddress)" -ForegroundColor Green
    } else {
        Write-Host "No IPv4 found" -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`nDone!" -ForegroundColor Cyan
pause
