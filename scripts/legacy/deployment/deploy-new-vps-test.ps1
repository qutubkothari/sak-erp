param(
  [string]$HostIp = "200.141.1.206",
  [string]$User = "root",
  [string]$RemotePath = "/var/www/sak-erp-test",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\hostinger_ed25519"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

Write-Host "Deploying current TEST/UAT ERP build to MIZANTRA NEW VPS only: $User@${HostIp}:$RemotePath" -ForegroundColor Cyan
Write-Host "Target domain: https://mizantra.saksolution.com" -ForegroundColor Cyan
Write-Host "This wrapper does not touch pmstest.saksolution.com, which is now treated as live/current client ERP." -ForegroundColor Yellow

$previousIp = $env:HOSTINGER_IP
$previousUser = $env:HOSTINGER_USER
$previousPath = $env:HOSTINGER_REMOTE_PATH
$previousKey = $env:HOSTINGER_KEY_PATH

try {
  $env:HOSTINGER_IP = $HostIp
  $env:HOSTINGER_USER = $User
  $env:HOSTINGER_REMOTE_PATH = $RemotePath
  $env:HOSTINGER_KEY_PATH = $KeyPath

  & "$PSScriptRoot\deploy-hostinger.ps1" -Environment mizantra
  if ($LASTEXITCODE -ne 0) {
    throw "Deploy failed with exit code $LASTEXITCODE"
  }
} finally {
  if ($null -ne $previousIp) { $env:HOSTINGER_IP = $previousIp } else { Remove-Item Env:HOSTINGER_IP -ErrorAction SilentlyContinue }
  if ($null -ne $previousUser) { $env:HOSTINGER_USER = $previousUser } else { Remove-Item Env:HOSTINGER_USER -ErrorAction SilentlyContinue }
  if ($null -ne $previousPath) { $env:HOSTINGER_REMOTE_PATH = $previousPath } else { Remove-Item Env:HOSTINGER_REMOTE_PATH -ErrorAction SilentlyContinue }
  if ($null -ne $previousKey) { $env:HOSTINGER_KEY_PATH = $previousKey } else { Remove-Item Env:HOSTINGER_KEY_PATH -ErrorAction SilentlyContinue }
}
