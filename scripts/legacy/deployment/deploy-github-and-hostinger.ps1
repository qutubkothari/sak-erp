# Automated Deploy to GitHub and Hostinger
# This script:
# 1. Commits and pushes code to GitHub
# 2. Builds the app locally
# 3. Deploys to Hostinger VPS

param(
    [string]$CommitMessage,
    [switch]$SkipGitPush,
    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"

# Ensure we run from the repo root (this file lives there)
if ($PSScriptRoot) {
    Set-Location $PSScriptRoot
}

# Auto-config for CI environments
if ($env:GITHUB_ACTIONS -eq 'true' -or $env:CI -eq 'true') {
    $SkipGitPush = $true
    $NonInteractive = $true
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "GitHub + Hostinger Deployment" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# ====== STEP 1: GitHub Push ======
Write-Host "=== Step 1: Pushing to GitHub ===" -ForegroundColor Yellow

if ($SkipGitPush) {
    Write-Host "⏭️  Skipping git commit/push (SkipGitPush enabled)" -ForegroundColor Gray
} else {
    $commitMessage = $CommitMessage
    if ([string]::IsNullOrWhiteSpace($commitMessage)) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
        $commitMessage = "Auto deploy - $timestamp"
    }

    git add -A
    if ($LASTEXITCODE -ne 0) {
        throw "git add failed (exit code: $LASTEXITCODE)"
    }

    git commit -m $commitMessage
    $commitExit = $LASTEXITCODE

    if ($commitExit -ne 0) {
        # Common case: nothing to commit
        $statusText = (git status --porcelain) | Out-String
        if ([string]::IsNullOrWhiteSpace($statusText)) {
            Write-Host "✅ No changes to commit" -ForegroundColor Green
        } else {
            $msg = "git commit failed (exit code: $commitExit)"
            if ($NonInteractive) {
                throw $msg
            }
            Write-Host "⚠️  $msg" -ForegroundColor Yellow
            $continue = Read-Host "Continue with Hostinger deployment? (y/n)"
            if ($continue -ne "y") { exit 1 }
        }
    } else {
        git push origin main
        if ($LASTEXITCODE -ne 0) {
            $msg = "git push failed (exit code: $LASTEXITCODE)"
            if ($NonInteractive) {
                throw $msg
            }
            Write-Host "⚠️  $msg" -ForegroundColor Yellow
            $continue = Read-Host "Continue with Hostinger deployment? (y/n)"
            if ($continue -ne "y") { exit 1 }
        } else {
            Write-Host "✅ Pushed to GitHub successfully`n" -ForegroundColor Green
        }
    }
}

# ====== STEP 2: Deploy to Hostinger ======
Write-Host "=== Step 2: Deploying to Hostinger ===" -ForegroundColor Yellow

# Run the Hostinger deployment script
$deployHostinger = Join-Path $PSScriptRoot 'deploy-hostinger.ps1'
& $deployHostinger

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "GitHub: https://github.com/qutubkothari/sak-erp" -ForegroundColor White
Write-Host "Hostinger: http://72.62.192.228`n" -ForegroundColor White
