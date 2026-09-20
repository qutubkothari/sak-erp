# SAK ERP - Parallel Deployment to GitHub & EC2
# Uploads changes to BOTH GitHub AND EC2 simultaneously (not EC2 from GitHub)

$ErrorActionPreference = "Stop"

Write-Host "`n🚀 SAK ERP - Parallel Deployment Starting...`n" -ForegroundColor Cyan

# ============================================
# STEP 1: Pre-flight Checks
# ============================================

Write-Host "📋 Step 1: Pre-flight checks..." -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "apps/web") -or -not (Test-Path "apps/api")) {
    Write-Host "❌ ERROR: Must run from sak-erp root directory!" -ForegroundColor Red
    exit 1
}

# Check if saif-erp.pem exists
if (-not (Test-Path "saif-erp.pem")) {
    Write-Host "❌ ERROR: saif-erp.pem not found!" -ForegroundColor Red
    exit 1
}

# Check git status
$status = git status --porcelain
if (-not $status) {
    Write-Host "⚠️  WARNING: No changes detected. Nothing to deploy." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? y or n"
    if ($continue -ne "y") {
        exit 0
    }
}

Write-Host "✅ Pre-flight checks passed`n" -ForegroundColor Green

# ============================================
# STEP 2: Get Commit Message
# ============================================

Write-Host "📝 Step 2: Commit message..." -ForegroundColor Yellow
$commitMsg = Read-Host "Enter commit message (or press Enter for auto-message)"
if (-not $commitMsg) {
    $commitMsg = "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}
Write-Host "   Using: $commitMsg`n" -ForegroundColor Gray

# ============================================
# STEP 3: Create Deployment Archive
# ============================================

Write-Host "📦 Step 3: Creating deployment archive..." -ForegroundColor Yellow

# Remove old archive if exists
if (Test-Path "web-deploy.tgz") {
    Remove-Item "web-deploy.tgz" -Force
}

# Create archive excluding node_modules, .next, and logs
tar --exclude="node_modules" --exclude=".next" --exclude="*.log" --exclude=".turbo" -czf web-deploy.tgz -C apps/web .

$archiveSize = (Get-Item "web-deploy.tgz").Length / 1MB
Write-Host "   ✅ Archive created: $([math]::Round($archiveSize, 2)) MB`n" -ForegroundColor Green

# ============================================
# STEP 4: Parallel Upload - GitHub & EC2
# ============================================

Write-Host "🔀 Step 4: Parallel upload to GitHub & EC2..." -ForegroundColor Yellow

# Define GitHub upload job
$gitHubJob = {
    param($msg)
    cd C:\Users\QK\Documents\GitHub\sak-erp
    git add .
    git commit -m $msg 2>&1 | Out-String
    git push origin main 2>&1 | Out-String
}

# Define EC2 upload job
$ec2Job = {
    $pemPath = "C:\Users\QK\Documents\GitHub\sak-erp\saif-erp.pem"
    
    # Upload archive
    $uploadResult = scp -i $pemPath C:\Users\QK\Documents\GitHub\sak-erp\web-deploy.tgz ubuntu@3.110.100.60:/home/ubuntu/ 2>&1 | Out-String
    
    # Extract and restart
    $deployResult = ssh -i $pemPath ubuntu@3.110.100.60 @"
cd /home/ubuntu/sak-erp/apps
echo '🛑 Stopping web service...'
pm2 stop sak-web
echo '🗑️  Removing old files...'
sudo rm -rf web
mkdir -p web
cd web
echo '📦 Extracting new files...'
sudo tar -xzf /home/ubuntu/web-deploy.tgz
sudo chown -R ubuntu:ubuntu .
echo '📥 Installing dependencies...'
npm install --legacy-peer-deps --quiet
echo '🔄 Restarting web service...'
cd /home/ubuntu/sak-erp
pm2 restart sak-web
rm -f /home/ubuntu/web-deploy.tgz
echo '✅ EC2 deployment complete!'
pm2 status
"@ 2>&1 | Out-String
    
    return @{
        Upload = $uploadResult
        Deploy = $deployResult
    }
}

# Start both jobs in parallel
Write-Host "   ⏳ Uploading to GitHub..." -ForegroundColor Cyan
$githubTask = Start-Job -ScriptBlock $gitHubJob -ArgumentList $commitMsg

Write-Host "   ⏳ Uploading to EC2..." -ForegroundColor Cyan
$ec2Task = Start-Job -ScriptBlock $ec2Job

# Wait for both to complete
Write-Host "`n   Waiting for uploads to complete...`n" -ForegroundColor Gray

$jobs = @($githubTask, $ec2Task)
$completed = 0

while ($completed -lt 2) {
    Start-Sleep -Seconds 2
    
    # Check GitHub
    if ($githubTask.State -eq "Completed" -and $completed -lt 1) {
        Write-Host "   ✅ GitHub upload complete!" -ForegroundColor Green
        $completed++
    }
    
    # Check EC2
    if ($ec2Task.State -eq "Completed" -and ($completed -lt 2 -or $ec2Task.State -ne $githubTask.State)) {
        Write-Host "   ✅ EC2 upload complete!" -ForegroundColor Green
        $completed++
    }
    
    # Show progress indicator
    Write-Host "." -NoNewline -ForegroundColor Gray
}

Write-Host "`n"

# ============================================
# STEP 5: Get Results
# ============================================

Write-Host "📊 Step 5: Deployment results..." -ForegroundColor Yellow

# GitHub results
$githubResult = Receive-Job -Job $githubTask
if ($githubResult -match "error|fatal") {
    Write-Host "`n❌ GitHub Upload FAILED:" -ForegroundColor Red
    Write-Host $githubResult -ForegroundColor Red
} else {
    Write-Host "`n✅ GitHub Upload SUCCESS" -ForegroundColor Green
    if ($githubResult -match "nothing to commit") {
        Write-Host "   (No new changes to commit)" -ForegroundColor Gray
    } else {
        Write-Host "   Changes pushed to origin/main" -ForegroundColor Gray
    }
}

# EC2 results
$ec2Result = Receive-Job -Job $ec2Task
if ($ec2Result.Deploy -match "error|Error|failed|Failed") {
    Write-Host "`n❌ EC2 Deployment FAILED:" -ForegroundColor Red
    Write-Host $ec2Result.Deploy -ForegroundColor Red
} else {
    Write-Host "`n✅ EC2 Deployment SUCCESS" -ForegroundColor Green
    Write-Host "   Server: 3.110.100.60" -ForegroundColor Gray
    Write-Host "   URL: http://erp.saksolution.com" -ForegroundColor Gray
}

# Clean up jobs
Remove-Job -Job $githubTask, $ec2Task -Force

# ============================================
# STEP 6: Cleanup
# ============================================

Write-Host "`n🧹 Step 6: Cleanup..." -ForegroundColor Yellow
Remove-Item "web-deploy.tgz" -Force
Write-Host "   ✅ Temporary files removed`n" -ForegroundColor Green

# ============================================
# DONE
# ============================================

Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 Your changes are now live at:" -ForegroundColor White
Write-Host "   • GitHub: https://github.com/YOUR-USERNAME/sak-erp" -ForegroundColor Cyan
Write-Host "   • Production: http://erp.saksolution.com" -ForegroundColor Cyan
Write-Host "   • EC2 Direct: http://3.110.100.60" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Clear browser cache with Ctrl+Shift+Delete" -ForegroundColor Yellow
Write-Host ""
