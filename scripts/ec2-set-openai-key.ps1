# Sets OPENAI_API_KEY on the EC2 host (without committing secrets to git)
# - Prompts for the key (not echoed)
# - Uploads to /tmp/sak-openai.env
# - Ensures /home/ubuntu/sak-erp/scripts/ec2-apply-openai-env.sh exists
# - Runs the apply script and restarts sak-api

param(
  [string]$Ec2Ip = "3.110.100.60",
  [string]$Ec2User = "ubuntu",
  [string]$KeyPath = ".\\saif-erp.pem",
  [string]$RemoteBase = "/home/ubuntu/sak-erp"
)

$ErrorActionPreference = "Stop"

function Invoke-Ssh([string]$remoteCommand) {
  & ssh.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=20 -i $KeyPath "$Ec2User@$Ec2Ip" $remoteCommand
}

function ScpToEc2([string]$localPath, [string]$remotePath) {
  & scp.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i $KeyPath $localPath "$Ec2User@${Ec2Ip}:$remotePath"
}

if (-not (Test-Path $KeyPath)) {
  throw "SSH key not found at: $KeyPath"
}

$secure = Read-Host "Paste OPENAI_API_KEY" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($plain)) {
  throw "OPENAI_API_KEY was empty"
}

$tmpEnv = Join-Path $env:TEMP ("sak-openai-{0}.env" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
try {
  Set-Content -Path $tmpEnv -Value ("OPENAI_API_KEY={0}`n" -f $plain) -Encoding Ascii

  Write-Host "Uploading key payload to EC2..." -ForegroundColor Cyan
  ScpToEc2 $tmpEnv "/tmp/sak-openai.env" | Out-Host

  $localApplyScript = Join-Path $PSScriptRoot "ec2-apply-openai-env.sh"
  if (-not (Test-Path $localApplyScript)) {
    throw "Missing local apply script: $localApplyScript"
  }

  Write-Host "Ensuring apply script exists on EC2..." -ForegroundColor Cyan
  Invoke-Ssh "bash -lc 'mkdir -p $RemoteBase/scripts'" | Out-Host
  ScpToEc2 $localApplyScript "$RemoteBase/scripts/ec2-apply-openai-env.sh" | Out-Host

  Write-Host "Applying key and restarting sak-api..." -ForegroundColor Cyan
  Invoke-Ssh "bash -lc 'chmod +x $RemoteBase/scripts/ec2-apply-openai-env.sh; $RemoteBase/scripts/ec2-apply-openai-env.sh; pm2 status sak-api'" | Out-Host

  Write-Host "Done. OPENAI_API_KEY applied and sak-api restarted." -ForegroundColor Green
} finally {
  Remove-Item -Path $tmpEnv -Force -ErrorAction SilentlyContinue
  $plain = $null
}
