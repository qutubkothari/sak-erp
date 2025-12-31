# Deploy Web Frontend to Production Server
Write-Host "Deploying Frontend to Production..." -ForegroundColor Cyan

# Build locally
Write-Host ""
Write-Host "Building frontend locally..." -ForegroundColor Yellow
Set-Location "apps\web"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Create archive
Write-Host ""
Write-Host "Creating deployment archive..." -ForegroundColor Yellow
Set-Location ..\..

if (Test-Path "web-build.zip") {
    Remove-Item "web-build.zip"
}

Compress-Archive -Path "apps\web\.next" -DestinationPath "web-build.zip" -Force
Write-Host "Archive created: web-build.zip" -ForegroundColor Green
Write-Host ""
Write-Host "Build ready for deployment!" -ForegroundColor Cyan
