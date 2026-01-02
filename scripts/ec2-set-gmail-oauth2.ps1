# Securely configures Gmail OAuth2 + Pub/Sub env vars on EC2 (no secrets committed to git)
# - Prompts for client id/secret/refresh token
# - Uploads /tmp/sak-gmail-oauth2.env
# - Runs scripts/ec2-apply-gmail-oauth2-env.sh on EC2

param(
  [string]$Ec2Ip = "3.110.100.60",
  [string]$Ec2User = "ubuntu",
  [string]$KeyPath = ".\\saif-erp.pem",
  [string]$RemoteBase = "/home/ubuntu/sak-erp",
  [string]$DefaultGmailUser = "erpsak53@gmail.com",
  [string]$DefaultRedirectUri = "https://erp.saksolution.com/api/v1/auth/google/callback"
)

$ErrorActionPreference = "Stop"

function Invoke-Ssh([string]$remoteCommand) {
  & ssh.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=25 -i $KeyPath "$Ec2User@$Ec2Ip" $remoteCommand
}

function ScpToEc2([string]$localPath, [string]$remotePath) {
  & scp.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i $KeyPath $localPath "$Ec2User@${Ec2Ip}:$remotePath"
}

function Read-Secret([string]$prompt) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found at: $KeyPath"
}

Write-Host "`n=== Gmail OAuth2 + Pub/Sub configuration (EC2) ===" -ForegroundColor Cyan
Write-Host "EC2: $Ec2User@$Ec2Ip" -ForegroundColor Gray
Write-Host "Remote base: $RemoteBase" -ForegroundColor Gray
Write-Host "" 

$clientId = Read-Host "Enter GMAIL_CLIENT_ID (looks like ...apps.googleusercontent.com)"
if ([string]::IsNullOrWhiteSpace($clientId)) { throw "GMAIL_CLIENT_ID is required" }

$clientSecret = Read-Secret "Enter GMAIL_CLIENT_SECRET (hidden)"
if ([string]::IsNullOrWhiteSpace($clientSecret)) { throw "GMAIL_CLIENT_SECRET is required" }

$refreshToken = Read-Secret "Enter GMAIL_REFRESH_TOKEN (hidden)"
if ([string]::IsNullOrWhiteSpace($refreshToken)) { throw "GMAIL_REFRESH_TOKEN is required" }

$topic = Read-Host "Enter GMAIL_PUBSUB_TOPIC (projects/<id>/topics/<name>)"
if ([string]::IsNullOrWhiteSpace($topic)) { throw "GMAIL_PUBSUB_TOPIC is required" }

$gmailUser = Read-Host "Enter GMAIL_USER (default: $DefaultGmailUser)"
if ([string]::IsNullOrWhiteSpace($gmailUser)) { $gmailUser = $DefaultGmailUser }

$redirectUri = Read-Host "Enter GMAIL_REDIRECT_URI (default: $DefaultRedirectUri)"
if ([string]::IsNullOrWhiteSpace($redirectUri)) { $redirectUri = $DefaultRedirectUri }

# Write to a temp env file (ASCII is fine; secrets are base64-safe)
$tmpEnv = Join-Path $env:TEMP ("sak-gmail-oauth2-{0}.env" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  $content = @(
    "GMAIL_CLIENT_ID=$clientId",
    "GMAIL_CLIENT_SECRET=$clientSecret",
    "GMAIL_REFRESH_TOKEN=$refreshToken",
    "GMAIL_REDIRECT_URI=$redirectUri",
    "GMAIL_PUBSUB_TOPIC=$topic",
    "GMAIL_USER=$gmailUser",
    ""
  ) -join "`n"

  Set-Content -Path $tmpEnv -Value $content -Encoding Ascii

  Write-Host "Uploading OAuth2 env payload to EC2..." -ForegroundColor Cyan
  ScpToEc2 $tmpEnv "/tmp/sak-gmail-oauth2.env" | Out-Host

  $localApply = Join-Path $PSScriptRoot "ec2-apply-gmail-oauth2-env.sh"
  if (-not (Test-Path $localApply)) {
    throw "Missing local apply script: $localApply"
  }

  Write-Host "Ensuring apply script exists on EC2..." -ForegroundColor Cyan
  Invoke-Ssh "bash -lc 'mkdir -p $RemoteBase/scripts'" | Out-Host
  ScpToEc2 $localApply "$RemoteBase/scripts/ec2-apply-gmail-oauth2-env.sh" | Out-Host

  Write-Host "Applying env and restarting sak-api..." -ForegroundColor Cyan
  Invoke-Ssh "bash -lc 'chmod +x $RemoteBase/scripts/ec2-apply-gmail-oauth2-env.sh; $RemoteBase/scripts/ec2-apply-gmail-oauth2-env.sh; pm2 status sak-api'" | Out-Host

  Write-Host "Done. Gmail OAuth2 env applied on EC2." -ForegroundColor Green
} finally {
  Remove-Item -Path $tmpEnv -Force -ErrorAction SilentlyContinue
  $clientSecret = $null
  $refreshToken = $null
}
