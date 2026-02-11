# Test script to verify what the live site is serving

Write-Host "`n=== Testing Live Site ==="Write-Host "Domain: https://pms.saksolution.com"
Write-Host ""

# Test 1: Check if site is accessible
Write-Host "Test 1: Site accessibility"
try {
    $response = Invoke-WebRequest -Uri "https://pms.saksolution.com" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Site is accessible (Status: $($response.StatusCode))"
} catch {
    Write-Host "❌ Site not accessible: $($_.Exception.Message)"
}

# Test 2: Check API items endpoint
Write-Host "`nTest 2: API /inventory/items endpoint"
try {
    # Note: This will fail without auth, but we can see if endpoint exists
    $apiResponse = Invoke-WebRequest -Uri "https://pms.saksolution.com/api/v1/inventory/items" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ API endpoint accessible"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "✅ API endpoint exists (401 Unauthorized - expected without token)"
    } else {
        Write-Host "⚠️ API returned status: $statusCode"
    }
}

# Test 3: Check Next.js build info
Write-Host "`nTest 3: SSH to server - Check deployment"
$sshKey = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$sshHost = "qutubk@72.62.192.228"

Write-Host "Checking BUILD_ID..."
ssh -i $sshKey $sshHost "cat /var/www/sak-erp/apps/web/.next/BUILD_ID"

Write-Host "`nChecking PM2 status..."
ssh -i $sshKey $sshHost "pm2 list | grep 'sak-'"

Write-Host "`n=== Instructions for User ===`n"
Write-Host "Please do the following IN ORDER:"
Write-Host "1. Open Chrome/Edge in INCOGNITO mode (Ctrl+Shift+N)"
Write-Host "2. Press F12 to open Developer Tools"
Write-Host "3. Go to 'Network' tab"
Write-Host "4. Check 'Disable cache' checkbox"
Write-Host "5. Go to: https://pms.saksolution.com/dashboard/inventory/items"
Write-Host "6. After page loads, look in Network tab for 'items' request"
Write-Host "7. Click on it, go to 'Response' tab"
Write-Host "8. Check if the JSON data has 'product_category' field"
Write-Host "9. Send screenshot of:"
Write-Host "   - The dropdown (should show 'SUB ASSEMBLIES')"
Write-Host "   - The Network response showing product_category field"
Write-Host "`n================================`n"
