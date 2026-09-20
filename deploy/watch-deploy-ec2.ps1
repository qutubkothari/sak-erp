# Watch + Auto-Deploy to EC2 (artifact-based)
# - Watches the repo for changes and runs deploy-ec2-auto.ps1 automatically.
# - Debounced and non-overlapping (queues one extra deploy if changes happen mid-deploy).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\deploy\watch-deploy-ec2.ps1
#
# Stop with Ctrl+C

param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path,
  [int]$DebounceSeconds = 3
)

$ErrorActionPreference = "Stop"

$deployScript = Join-Path $RepoRoot "deploy-ec2-auto.ps1"
if (-not (Test-Path $deployScript)) {
  throw "Deploy script not found: $deployScript"
}

Write-Host "Watching for changes in: $RepoRoot" -ForegroundColor Cyan
Write-Host "Deploy script: $deployScript" -ForegroundColor Cyan
Write-Host "Debounce: $DebounceSeconds seconds" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow

$excludedPathFragments = @(
  "\\.git\\",
  "\\node_modules\\",
  "\\apps\\web\\.next\\",
  "\\apps\\api\\dist\\",
  "\\packages\\hr-module\\dist\\",
  "\\.pnpm-store\\",
  "\\.next\\"
)

function Should-IgnorePath([string]$fullPath) {
  foreach ($frag in $excludedPathFragments) {
    if ($fullPath -like "*${frag}*") { return $true }
  }
  if ($fullPath -like "*.tar.gz") { return $true }
  if ($fullPath -like "*deploy-????????-??????.tar.gz") { return $true }
  return $false
}

$deployInProgress = $false
$pendingDeploy = $false
$lastChangeAt = Get-Date

$timer = New-Object System.Timers.Timer
$timer.Interval = 500
$timer.AutoReset = $true
$timer.Enabled = $true

$null = Register-ObjectEvent -InputObject $timer -EventName Elapsed -SourceIdentifier "DeployDebounce" -Action {
  if ($script:deployInProgress) { return }
  if (-not $script:pendingDeploy) { return }

  $elapsed = (New-TimeSpan -Start $script:lastChangeAt -End (Get-Date)).TotalSeconds
  if ($elapsed -lt $DebounceSeconds) { return }

  $script:pendingDeploy = $false
  $script:deployInProgress = $true

  try {
    Write-Host "\n=== Auto-deploy triggered ($(Get-Date -Format s)) ===" -ForegroundColor Green
    & powershell -ExecutionPolicy Bypass -File $deployScript
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Deploy failed (exit $LASTEXITCODE). Waiting for next change..." -ForegroundColor Red
    } else {
      Write-Host "Deploy complete. Waiting for changes..." -ForegroundColor Green
    }
  } catch {
    Write-Host "Deploy error: $($_.Exception.Message)" -ForegroundColor Red
  } finally {
    $script:deployInProgress = $false
  }
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $RepoRoot
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::DirectoryName

$onChange = {
  $path = $Event.SourceEventArgs.FullPath
  if (-not $path) { return }
  if (Should-IgnorePath $path) { return }

  $script:lastChangeAt = Get-Date
  $script:pendingDeploy = $true
}

$null = Register-ObjectEvent -InputObject $watcher -EventName Created -SourceIdentifier "WatchCreated" -Action $onChange
$null = Register-ObjectEvent -InputObject $watcher -EventName Changed -SourceIdentifier "WatchChanged" -Action $onChange
$null = Register-ObjectEvent -InputObject $watcher -EventName Renamed -SourceIdentifier "WatchRenamed" -Action $onChange
$null = Register-ObjectEvent -InputObject $watcher -EventName Deleted -SourceIdentifier "WatchDeleted" -Action $onChange

try {
  while ($true) {
    Start-Sleep -Seconds 1
  }
} catch [System.Management.Automation.PipelineStoppedException] {
  # Expected when the user stops the script with Ctrl+C.
} finally {
  $watcher.EnableRaisingEvents = $false
  $watcher.Dispose()

  $timer.Stop()
  $timer.Dispose()

  Unregister-Event -SourceIdentifier "DeployDebounce" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "WatchCreated" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "WatchChanged" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "WatchRenamed" -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier "WatchDeleted" -ErrorAction SilentlyContinue

  Write-Host "Stopped." -ForegroundColor Yellow
}
