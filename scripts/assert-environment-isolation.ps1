param(
  [string]$KeyPath = "$env:USERPROFILE\.ssh\hostinger_ed25519",
  [string]$TestHost = "200.141.1.206",
  [string]$TestUser = "root",
  [string]$TestAppPath = "/var/www/sak-erp-test",
  [string]$LiveHost = "72.62.192.228",
  [string]$LiveUser = "qutubk",
  [string]$LiveAppPath = "/var/www/sak-erp-test"
)

$ErrorActionPreference = 'Stop'
$identityScript = Join-Path $PSScriptRoot 'qa\database-identity.cjs'

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}
if (-not (Test-Path -LiteralPath $identityScript)) {
  throw "Database identity helper not found: $identityScript"
}

function Get-RemoteDatabaseIdentity {
  param(
    [string]$EnvironmentName,
    [string]$RemoteUser,
    [string]$RemoteHost,
    [string]$RemoteAppPath
  )

  $remoteTarget = "$RemoteUser@$RemoteHost"
  $remoteScript = "$RemoteAppPath/scripts/qa/database-identity.cjs"
  & scp.exe -i $KeyPath -o BatchMode=yes -o ConnectTimeout=15 `
    $identityScript "${remoteTarget}:$remoteScript" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Could not install the read-only identity helper on $EnvironmentName."
  }

  $output = & ssh.exe -i $KeyPath -o BatchMode=yes -o ConnectTimeout=15 `
    $remoteTarget "cd '$RemoteAppPath' && pnpm --filter @sak-erp/api exec node ../../scripts/qa/database-identity.cjs .env"
  if ($LASTEXITCODE -ne 0) {
    throw "Could not read the $EnvironmentName database identity."
  }

  $json = ($output | Where-Object { $_ -match '^\{' } | Select-Object -Last 1)
  if (-not $json) {
    throw "The $EnvironmentName database identity response was invalid."
  }

  return ($json | ConvertFrom-Json)
}

$testIdentity = Get-RemoteDatabaseIdentity `
  -EnvironmentName 'Mizantra/test' `
  -RemoteUser $TestUser `
  -RemoteHost $TestHost `
  -RemoteAppPath $TestAppPath
$liveIdentity = Get-RemoteDatabaseIdentity `
  -EnvironmentName 'pmstest/live' `
  -RemoteUser $LiveUser `
  -RemoteHost $LiveHost `
  -RemoteAppPath $LiveAppPath

Write-Host "Mizantra/test fingerprint: $($testIdentity.fingerprint)"
Write-Host "pmstest/live fingerprint: $($liveIdentity.fingerprint)"

if ($testIdentity.fingerprint -eq $liveIdentity.fingerprint) {
  [Console]::Error.WriteLine('DEPLOYMENT BLOCKED: Mizantra/test and pmstest/live use the same PostgreSQL database.')
  exit 2
}

Write-Host 'Environment isolation verified: test and live databases are different.' -ForegroundColor Green
exit 0
