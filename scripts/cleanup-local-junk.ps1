param(
  [string]$BackupLabel = "manual-cleanup"
)

$ErrorActionPreference = "Stop"

$workspace = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backupRoot = "C:\Users\QK\Documents\GitHub\sak-erp-backups"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$report = Join-Path $backupRoot "cleanup-removed-$stamp.txt"

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

function Resolve-InWorkspace {
  param([Parameter(Mandatory = $true)][string]$Path)

  $resolved = (Resolve-Path -LiteralPath $Path -ErrorAction Stop).Path
  if (-not $resolved.StartsWith($workspace, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove outside workspace: $resolved"
  }
  return $resolved
}

$removed = New-Object System.Collections.Generic.List[object]

"Cleanup started: $(Get-Date -Format o)" | Set-Content -LiteralPath $report
"Workspace: $workspace" | Add-Content -LiteralPath $report
"Backup label: $BackupLabel" | Add-Content -LiteralPath $report

$fileCandidates = @()
$fileCandidates += Get-ChildItem -LiteralPath $workspace -File -Force |
  Where-Object { $_.Name -match '\.(tgz|tar\.gz|zip)$' }
$fileCandidates += Get-ChildItem -LiteralPath $workspace -File -Force |
  Where-Object { $_.Name -match '^\.deploy' -or $_.Name -match '\.log$' }

$webDir = Join-Path $workspace "apps\web"
if (Test-Path -LiteralPath $webDir) {
  $fileCandidates += Get-ChildItem -LiteralPath $webDir -File -Force -Filter "*.zip" -ErrorAction SilentlyContinue
}

$dirCandidateNames = @(
  ".turbo",
  "tmp",
  "qa-results",
  "backups",
  "backup",
  "apps\web\.next",
  "apps\api\dist",
  "sak-hr\node_modules",
  "sak-hr\.next"
)

$dirCandidates = foreach ($name in $dirCandidateNames) {
  $candidate = Join-Path $workspace $name
  if (Test-Path -LiteralPath $candidate) { $candidate }
}

"`nFiles removed:" | Add-Content -LiteralPath $report
foreach ($file in ($fileCandidates | Where-Object { $null -ne $_ } | Sort-Object FullName -Unique)) {
  $resolved = Resolve-InWorkspace -Path $file.FullName
  $size = (Get-Item -LiteralPath $resolved -Force).Length
  Remove-Item -LiteralPath $resolved -Force
  $removed.Add([pscustomobject]@{ Type = "File"; Path = $resolved; SizeBytes = [long]$size }) | Out-Null
  "$resolved`t$size" | Add-Content -LiteralPath $report
}

"`nDirectories removed:" | Add-Content -LiteralPath $report
foreach ($dir in $dirCandidates) {
  $resolved = Resolve-InWorkspace -Path $dir
  $size = (Get-ChildItem -LiteralPath $resolved -Recurse -File -Force -ErrorAction SilentlyContinue |
    Measure-Object Length -Sum).Sum
  if ($null -eq $size) { $size = 0 }
  Remove-Item -LiteralPath $resolved -Recurse -Force
  $removed.Add([pscustomobject]@{ Type = "Directory"; Path = $resolved; SizeBytes = [long]$size }) | Out-Null
  "$resolved`t$size" | Add-Content -LiteralPath $report
}

$total = ($removed | Measure-Object SizeBytes -Sum).Sum
if ($null -eq $total) { $total = 0 }
"`nTotal removed MB: $([math]::Round($total / 1MB, 2))" | Add-Content -LiteralPath $report

$removed |
  Group-Object Type |
  Select-Object Name, Count, @{ n = "SizeMB"; e = { [math]::Round(($_.Group | Measure-Object SizeBytes -Sum).Sum / 1MB, 2) } } |
  Format-Table -AutoSize

"Cleanup report: $report"
"TotalRemovedMB=$([math]::Round($total / 1MB, 2))"
