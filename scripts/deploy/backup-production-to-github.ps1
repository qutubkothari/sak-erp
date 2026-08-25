[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Reason,

  [string]$SshHost = '72.62.192.228',
  [string]$SshUser = 'qutubk',
  [string]$SshKeyPath = 'C:\Users\QK\.ssh\hostinger_ed25519',
  [string]$LiveRoot = '/var/www/sak-erp',
  [string]$GitHubRepository = 'qutubkothari/sak-erp'
)

$ErrorActionPreference = 'Stop'

if ($LiveRoot -ne '/var/www/sak-erp') {
  throw "Refusing unexpected production root: $LiveRoot"
}
if (-not (Test-Path -LiteralPath $SshKeyPath -PathType Leaf)) {
  throw "SSH key not found: $SshKeyPath"
}

$stamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$tag = "production-predeploy-$stamp"
$assetName = "sak-erp-live-$stamp.tgz"
$releaseDirectory = Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'output\releases'
New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
$assetPath = Join-Path $releaseDirectory $assetName
$checksumPath = "$assetPath.sha256"
$remoteAsset = "/tmp/$assetName"
$sshTarget = "$SshUser@$SshHost"

function Invoke-NativeChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Program,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Program exited with code $LASTEXITCODE"
  }
}

try {
  $remoteCommand = "cd '$LiveRoot' && tar -czf '$remoteAsset' apps/web/.next apps/web/public apps/web/package.json apps/web/next.config.js apps/api/dist apps/api/package.json package.json pnpm-lock.yaml"
  Invoke-NativeChecked 'ssh' @('-i', $SshKeyPath, '-o', 'BatchMode=yes', $sshTarget, $remoteCommand)
  Invoke-NativeChecked 'scp' @('-i', $SshKeyPath, '-o', 'BatchMode=yes', "${sshTarget}:$remoteAsset", $assetPath)
} finally {
  & ssh -i $SshKeyPath -o BatchMode=yes $sshTarget "rm -f '$remoteAsset'" 2>$null
}

$archiveFiles = & tar -tzf $assetPath
if ($LASTEXITCODE -ne 0) {
  throw 'The downloaded production archive is invalid.'
}
$unsafeEntry = $archiveFiles | Where-Object {
  $_ -match '(^|/)(\.env($|\.)|.*\.(pem|key|p12|pfx)$|credentials?($|[./_-]))' -or
  $_ -match '(^|/)\.\.(/|$)' -or
  $_ -match '^/'
} | Select-Object -First 1
if ($unsafeEntry) {
  throw "Refusing to upload an unsafe archive entry: $unsafeEntry"
}

$hash = (Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $assetName" | Out-File -LiteralPath $checksumPath -Encoding ascii -NoNewline

$credentialText = "protocol=https`nhost=github.com`n`n" | git credential fill
$credential = @{}
foreach ($line in ($credentialText -split "`r?`n")) {
  $index = $line.IndexOf('=')
  if ($index -gt 0) {
    $credential[$line.Substring(0, $index)] = $line.Substring($index + 1)
  }
}
if (-not $credential.password) {
  throw 'No GitHub credential is available from Git Credential Manager.'
}

$headers = @{
  Authorization = "Bearer $($credential.password)"
  Accept = 'application/vnd.github+json'
  'X-GitHub-Api-Version' = '2022-11-28'
}
$api = "https://api.github.com/repos/$GitHubRepository"
$notes = @"
Mandatory production pre-deploy backup.

Reason: $Reason
SHA-256: $hash
Captured from: $LiveRoot
Includes only compiled web/API artifacts and package metadata.
Excludes environment files, credentials, uploads, runtime logs, caches, and databases.

This release must exist before any production deployment proceeds.
"@
$body = @{
  tag_name = $tag
  target_commitish = 'main'
  name = "Production pre-deploy backup $stamp"
  body = $notes
  draft = $false
  prerelease = $false
} | ConvertTo-Json

$release = Invoke-RestMethod -Uri "$api/releases" -Headers $headers -Method Post -ContentType 'application/json' -Body $body
$uploadBase = $release.upload_url -replace '\{\?name,label\}$', ''
foreach ($path in @($assetPath, $checksumPath)) {
  $name = [Uri]::EscapeDataString((Split-Path -Leaf $path))
  $contentType = if ($path -eq $assetPath) { 'application/gzip' } else { 'text/plain' }
  Invoke-RestMethod -Uri "${uploadBase}?name=${name}" -Headers $headers -Method Post -ContentType $contentType -InFile $path | Out-Null
}

[PSCustomObject]@{
  Release = $release.html_url
  Artifact = $assetPath
  SHA256 = $hash
  DeploymentGate = 'PASSED - GitHub rollback release exists'
} | Format-List
