param(
  [string]$Base = 'http://3.110.100.60:4000/api/v1'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-CurlJson {
  param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [string[]]$Headers = @(),
    [string]$Body = $null,
    [string[]]$Form = @(),
    [string]$InFile = $null
  )

  # Use a unique marker instead of relying on \n handling in curl -w on Windows.
  $marker = '|||HTTP_STATUS:'
  $args = @('-s', '-w', ($marker + '%{http_code}|||'), '-X', $Method, $Url)
  foreach ($h in $Headers) { $args += @('-H', $h) }

  if (-not [string]::IsNullOrEmpty($Body)) {
    $args += @('--data-raw', $Body)
  }

  if (-not [string]::IsNullOrEmpty($InFile)) {
    $args += @('--data-binary', "@$InFile")
  }

  foreach ($f in $Form) { $args += @('-F', $f) }

  $raw = & curl.exe @args
  if ($LASTEXITCODE -ne 0) {
    $joined = ($args | ForEach-Object { "[$_]" }) -join ' '
    throw "curl.exe failed with exit code $LASTEXITCODE. Args: $joined"
  }

  $idx = $raw.LastIndexOf($marker)
  if ($idx -lt 0) {
    throw "Unexpected curl output (missing status marker '$marker'): $raw"
  }

  $bodyText = $raw.Substring(0, $idx).Trim()
  $statusText = $raw.Substring($idx + $marker.Length).Trim()
  if ($statusText.EndsWith('|||')) {
    $statusText = $statusText.Substring(0, $statusText.Length - 3)
  }

  $status = [int]$statusText

  $json = $null
  if ($bodyText) {
    try { $json = $bodyText | ConvertFrom-Json } catch { $json = $bodyText }
  }

  return [pscustomobject]@{ status = $status; bodyText = $bodyText; body = $json }
}

$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 6)
$email = "smoke_$suffix@example.com"
$pass = 'Test1234!'
$company = "Smoke Test Co $suffix"

Write-Host "EMAIL   $email"
Write-Host "COMPANY $company"

$regBody = (@{ email = $email; password = $pass; companyName = $company } | ConvertTo-Json -Compress)
$regFile = Join-Path $env:TEMP ("reg-$suffix.json")
$regBody | Out-File -Encoding utf8 -NoNewline $regFile

$reg = Invoke-CurlJson -Method 'POST' -Url "$Base/auth/register" -Headers @('Content-Type: application/json') -InFile $regFile
Write-Host "REGISTER_STATUS $($reg.status)"
if ($reg.status -ge 400) { throw "Register failed: $($reg.bodyText)" }

$token = $null
if ($reg.body -and ($reg.body.PSObject.Properties.Name -contains 'access_token')) {
  $token = $reg.body.access_token
} elseif ($reg.body -and ($reg.body.PSObject.Properties.Name -contains 'accessToken')) {
  $token = $reg.body.accessToken
}
if (-not $token) { throw 'No access_token returned from register' }

$tmp = Join-Path $env:TEMP ("smoke-$suffix.txt")
'hello' | Out-File -Encoding ascii $tmp

$upload = Invoke-CurlJson -Method 'POST' -Url "$Base/documents/upload" -Headers @("Authorization: Bearer $token") -Form @(
  "file=@$tmp",
  'title=',
  'documentType='
)
Write-Host "UPLOAD_STATUS $($upload.status)"
if ($upload.status -ge 400) { throw "Upload failed: $($upload.bodyText)" }

$docId = $upload.body.id
if (-not $docId) { throw 'No document id returned from upload' }
Write-Host "DOCUMENT_ID $docId"

$signed = Invoke-CurlJson -Method 'GET' -Url "$Base/documents/$docId/signed-url?expiresIn=120" -Headers @(
  "Authorization: Bearer $token"
)
Write-Host "SIGNED_URL_STATUS $($signed.status)"
Write-Host $signed.bodyText
if ($signed.status -ge 400) { throw "Signed URL failed: $($signed.bodyText)" }

$signedUrl = $null
if ($signed.body -and ($signed.body.PSObject.Properties.Name -contains 'url')) {
  $signedUrl = $signed.body.url
}
if (-not $signedUrl) { throw 'Signed URL response did not include url' }

# Best-effort: verify the signed URL is fetchable (may return 200/302 depending on storage).
# Use a short timeout so this script can't hang if storage is slow/unreachable.
$headOut = & curl.exe -s --max-time 10 -o NUL -I -w 'HTTP:%{http_code}' "$signedUrl"
Write-Host "SIGNED_URL_HEAD $headOut"

$qc = Invoke-CurlJson -Method 'POST' -Url "$Base/documents/$docId/quality-check" -Headers @(
  "Authorization: Bearer $token",
  'Content-Type: application/json'
) -Body '{}'

Write-Host "QC_STATUS $($qc.status)"
Write-Host $qc.bodyText

$del = Invoke-CurlJson -Method 'DELETE' -Url "$Base/documents/$docId" -Headers @(
  "Authorization: Bearer $token"
)
Write-Host "DELETE_STATUS $($del.status)"
Write-Host $del.bodyText
if ($del.status -ge 400) { throw "Delete failed: $($del.bodyText)" }
