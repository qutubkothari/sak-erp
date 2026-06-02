# =====================================================
# RESTORE TO ANY PREVIOUS VERSION
# Run this to rollback code to any tagged version
# =====================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [switch]$CreateBranch,
    [switch]$Force
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  SAK ERP Version Restore Tool" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if version starts with 'v'
if (-not $Version.StartsWith('v')) {
    $Version = "v$Version"
}

Write-Host "Target version: $Version" -ForegroundColor Yellow
Write-Host ""

# Show current status
Write-Host "Current status:" -ForegroundColor Green
$currentBranch = git branch --show-current
$currentCommit = git rev-parse --short HEAD
Write-Host "  Branch: $currentBranch" -ForegroundColor White
Write-Host "  Commit: $currentCommit" -ForegroundColor White
Write-Host ""

# Check if version exists
Write-Host "Checking if version exists..." -ForegroundColor Green
$tagExists = git tag -l $Version

if (-not $tagExists) {
    Write-Host "❌ ERROR: Version $Version not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available versions:" -ForegroundColor Yellow
    git tag -l "v*" | Sort-Object -Descending | Select-Object -First 10
    Write-Host ""
    Write-Host "To see all versions: git tag -l" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Version $Version found" -ForegroundColor Green
Write-Host ""

# Show version info
Write-Host "Version details:" -ForegroundColor Green
$commitInfo = git log -1 --format="%h - %s (%cr)" $Version
Write-Host "  $commitInfo" -ForegroundColor White
Write-Host ""

# Confirm restore
if (-not $Force) {
    $confirm = Read-Host "Are you sure you want to restore to $Version? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "❌ Restore cancelled" -ForegroundColor Red
        exit 0
    }
}

# Perform restore
Write-Host ""
Write-Host "Restoring to $Version..." -ForegroundColor Green

if ($CreateBranch) {
    $branchName = "restore-$Version-$(Get-Date -Format 'yyyyMMdd')"
    Write-Host "Creating branch: $branchName" -ForegroundColor Yellow
    git checkout -b $branchName $Version
    Write-Host ""
    Write-Host "✅ Restored to version $Version in branch '$branchName'" -ForegroundColor Green
} else {
    # Stash any current changes
    $hasChanges = git status --porcelain
    if ($hasChanges) {
        Write-Host "Stashing current changes..." -ForegroundColor Yellow
        git stash push -m "Auto-stash before restore to $Version"
    }
    
    git checkout $Version
    Write-Host ""
    Write-Host "✅ Restored to version $Version" -ForegroundColor Green
    Write-Host "⚠️  You are now in 'detached HEAD' state" -ForegroundColor Yellow
    Write-Host "   Create a branch to make changes: git checkout -b fix-branch" -ForegroundColor Gray
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Restore Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
if ($CreateBranch) {
    Write-Host "  1. Test the application" -ForegroundColor White
    Write-Host "  2. If good, merge to main: git checkout main; git merge $branchName" -ForegroundColor White
} else {
    Write-Host "  1. Create a branch to work: git checkout -b restore-work" -ForegroundColor White
    Write-Host "  2. Test the application" -ForegroundColor White
}
Write-Host ""
Write-Host "To go back to main: git checkout main" -ForegroundColor Gray
