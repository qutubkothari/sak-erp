param(
  [ValidateSet('live', 'test', 'mizantra', 'pmstest-live')]
  [string]$Environment = 'live',
  [string]$ApiEnvFile,
  [switch]$SkipLocalEnvValidation
)

# Automated Hostinger Deploy (artifact-based) — builds locally, uploads to Hostinger VPS, restarts PM2
# - No git commit/push required
# - Avoids heavy builds on VPS by building locally

$ErrorActionPreference = "Continue"

# ====== CONFIG (Hostinger VPS) ======
$HOSTINGER_IP = if ($env:HOSTINGER_IP) { $env:HOSTINGER_IP } else { "72.62.192.228" }
$HOSTINGER_USER = if ($env:HOSTINGER_USER) { $env:HOSTINGER_USER } else { "qutubk" }
$KEY_PATH = if ($env:HOSTINGER_KEY_PATH) {
  $env:HOSTINGER_KEY_PATH
} else {
  $preferred = "$env:USERPROFILE\.ssh\hostinger_ed25519"
  if (Test-Path $preferred) {
    $preferred
  } else {
    "$env:USERPROFILE\.ssh\id_ed25519"
  }
}

function Get-EnvironmentConfig([string]$targetEnvironment) {
  switch ($targetEnvironment) {
    'test' {
      return @{
        Name = 'mizantra'
        RemotePath = if ($env:HOSTINGER_REMOTE_PATH) { $env:HOSTINGER_REMOTE_PATH } else { '/var/www/sak-erp-test' }
        Pm2ApiName = 'sak-api-test'
        Pm2WebName = 'sak-web-test'
        ApiPort = 4001
        WebPort = 3001
        Domain = 'mizantra.saksolution.com'
        ApiBaseUrl = 'https://mizantra.saksolution.com/api/v1'
        LocalApiEnvFile = if ($ApiEnvFile) { $ApiEnvFile } else { 'apps/api/.env.test' }
      }
    }
    'mizantra' {
      return @{
        Name = 'mizantra'
        RemotePath = if ($env:HOSTINGER_REMOTE_PATH) { $env:HOSTINGER_REMOTE_PATH } else { '/var/www/sak-erp-test' }
        Pm2ApiName = 'sak-api-test'
        Pm2WebName = 'sak-web-test'
        ApiPort = 4001
        WebPort = 3001
        Domain = 'mizantra.saksolution.com'
        ApiBaseUrl = 'https://mizantra.saksolution.com/api/v1'
        LocalApiEnvFile = if ($ApiEnvFile) { $ApiEnvFile } else { 'apps/api/.env.test' }
      }
    }
    'pmstest-live' {
      return @{
        Name = 'pmstest-live'
        RemotePath = if ($env:HOSTINGER_REMOTE_PATH) { $env:HOSTINGER_REMOTE_PATH } else { '/var/www/sak-erp-test' }
        Pm2ApiName = 'sak-api-test'
        Pm2WebName = 'sak-web-test'
        ApiPort = 4001
        WebPort = 3001
        Domain = 'pmstest.saksolution.com'
        ApiBaseUrl = 'https://pmstest.saksolution.com/api/v1'
        LocalApiEnvFile = if ($ApiEnvFile) { $ApiEnvFile } else { 'apps/api/.env.test' }
      }
    }
    default {
      return @{
        Name = 'live'
        RemotePath = if ($env:HOSTINGER_REMOTE_PATH) { $env:HOSTINGER_REMOTE_PATH } else { '/var/www/sak-erp' }
        Pm2ApiName = 'sak-api'
        Pm2WebName = 'sak-web'
        ApiPort = 4000
        WebPort = 3000
        Domain = 'pms.saksolution.com'
        ApiBaseUrl = 'https://pms.saksolution.com/api/v1'
        LocalApiEnvFile = if ($ApiEnvFile) { $ApiEnvFile } else { 'apps/api/.env' }
      }
    }
  }
}

$Target = Get-EnvironmentConfig $Environment
$REMOTE_PATH = $Target.RemotePath
$PM2_API_NAME = $Target.Pm2ApiName
$PM2_WEB_NAME = $Target.Pm2WebName
$API_PORT = $Target.ApiPort
$WEB_PORT = $Target.WebPort
$DOMAIN = $Target.Domain
$API_BASE_URL = $Target.ApiBaseUrl
$LOCAL_API_ENV_FILE = $Target.LocalApiEnvFile

# ====== Helpers ======
function Assert-CommandExists($name) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Required command not found: $name"
  }
}

function Run($label, $scriptBlock) {
  Write-Host "`n=== $label ===" -ForegroundColor Cyan
  & $scriptBlock
}

function Invoke-Ssh($remoteCommand) {
  & ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=20 -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" $remoteCommand
  if ($LASTEXITCODE -ne 0) {
    throw "Remote SSH command failed with exit code $LASTEXITCODE"
  }
}

function ScpToHostinger($localPath, $remotePath) {
  & scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i $KEY_PATH $localPath "$HOSTINGER_USER@${HOSTINGER_IP}:$remotePath"
}

# ====== Preconditions ======
Run "Preflight" {
  if (-not (Test-Path $KEY_PATH)) {
    throw "SSH key not found at: $KEY_PATH. Please ensure the key exists."
  }
  Write-Host "Using SSH key: $KEY_PATH" -ForegroundColor Gray
  $script:usePassword = $false

  if (-not $SkipLocalEnvValidation) {
    if (-not (Test-Path $LOCAL_API_ENV_FILE)) {
      Write-Host ""
      Write-Host "⚠️  WARNING: $LOCAL_API_ENV_FILE not found!" -ForegroundColor Red
      Write-Host "   $Environment deploy needs an API env file with its own URLs, CORS, and secrets." -ForegroundColor Red
      Write-Host "   Create it with at minimum:" -ForegroundColor Yellow
      Write-Host "     SUPABASE_URL=https://[project-ref].supabase.co" -ForegroundColor Gray
      Write-Host "     SUPABASE_KEY=eyJ..." -ForegroundColor Gray
      Write-Host "     DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" -ForegroundColor Gray
      Write-Host "     JWT_SECRET=..." -ForegroundColor Gray
      Write-Host "     FRONTEND_URL=https://$DOMAIN" -ForegroundColor Gray
      Write-Host "     CORS_ORIGINS=https://$DOMAIN" -ForegroundColor Gray
      Write-Host "     GMAIL_REDIRECT_URI=https://$DOMAIN/api/v1/auth/google/callback" -ForegroundColor Gray
      Write-Host ""
      throw "Missing API env file for $Environment environment: $LOCAL_API_ENV_FILE"
    }

    $envContent = Get-Content $LOCAL_API_ENV_FILE -Raw
    $missingKeys = @()
    foreach ($key in @('SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET')) {
      if ($envContent -notmatch "(?m)^\s*$key\s*=") { $missingKeys += $key }
    }
    if ($missingKeys.Count -gt 0) {
      Write-Host "⚠️  $LOCAL_API_ENV_FILE is missing required keys: $($missingKeys -join ', ')" -ForegroundColor Yellow
    } else {
      Write-Host "✅ $LOCAL_API_ENV_FILE found with required keys" -ForegroundColor Green
    }
  }

  Assert-CommandExists "ssh"
  Assert-CommandExists "scp"
  Assert-CommandExists "pnpm"
  Assert-CommandExists "tar"
  Assert-CommandExists "git"

  Write-Host "Local repo: $(Get-Location)" -ForegroundColor Gray
  Write-Host "Hostinger VPS: $HOSTINGER_USER@$HOSTINGER_IP" -ForegroundColor Gray
  Write-Host "Environment: $Environment" -ForegroundColor Gray
  Write-Host "Remote path: $REMOTE_PATH" -ForegroundColor Gray
  Write-Host "Domain: $DOMAIN" -ForegroundColor Gray
  Write-Host "Web/API ports: $WEB_PORT/$API_PORT" -ForegroundColor Gray

  # Quick connectivity check
  Write-Host "Testing connection to Hostinger VPS..." -ForegroundColor Gray
  try {
    Invoke-Ssh "echo 'Connection successful'; node -v 2>/dev/null || echo 'Node.js not installed'; pnpm -v 2>/dev/null || echo 'pnpm not installed'; pm2 -v 2>/dev/null || echo 'PM2 not installed'" | Out-Host
  } catch {
    Write-Host "Connection test failed. Proceeding anyway..." -ForegroundColor Yellow
  }
}

# ====== Build locally ======
Run "Install deps (local)" {
  pnpm install --frozen-lockfile
}

Run "Build hr-module (local)" {
  pnpm -C packages/hr-module build
  if ($LASTEXITCODE -ne 0) { throw "hr-module build failed with exit code $LASTEXITCODE" }
}

Run "Build web (local)" {
  $previousApiUrl = $env:NEXT_PUBLIC_API_URL
  $previousInternalApiUrl = $env:INTERNAL_API_URL
  $previousProxyApiUrl = $env:API_URL
  # Use a relative API base so browser requests go to :3000/api/v1/* and
  # Next.js rewrites proxy them to the API on :4000 (avoids hard-coded IPs/CORS).
  $env:NEXT_PUBLIC_API_URL = "/api/v1"
  $env:INTERNAL_API_URL = "http://127.0.0.1:$API_PORT/api/v1"
  $env:API_URL = "http://127.0.0.1:$API_PORT"

  pnpm -C apps/web build
  $webExitCode = $LASTEXITCODE

  if ($null -ne $previousApiUrl) {
    $env:NEXT_PUBLIC_API_URL = $previousApiUrl
  } else {
    Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue
  }

  if ($null -ne $previousInternalApiUrl) {
    $env:INTERNAL_API_URL = $previousInternalApiUrl
  } else {
    Remove-Item Env:INTERNAL_API_URL -ErrorAction SilentlyContinue
  }

  if ($null -ne $previousProxyApiUrl) {
    $env:API_URL = $previousProxyApiUrl
  } else {
    Remove-Item Env:API_URL -ErrorAction SilentlyContinue
  }

  if ($webExitCode -ne 0) {
    throw "Web build failed with exit code $webExitCode"
  }
}

Run "Build api (local)" {
  pnpm -C apps/api build
  if ($LASTEXITCODE -ne 0) { throw "API build failed with exit code $LASTEXITCODE" }
}

# ====== Package artifacts ======
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archive = "deploy-$stamp.tar.gz"

Run "Create artifact archive ($archive)" {
  if (Test-Path $archive) { Remove-Item $archive -Force }

  # Keep this minimal but sufficient for runtime + workspace pnpm install
  $requiredInputs = @(
    'apps/web/.next',
    'apps/web/package.json',
    'apps/web/next.config.js',
    'apps/api/dist',
    'apps/api/package.json',
    'apps/api/assets',
    'packages/database/package.json',
    'packages/database/prisma',
    'packages/hr-module/dist',
    'packages/hr-module/package.json',
    'package.json',
    'pnpm-workspace.yaml',
    'pnpm-lock.yaml'
  )

  $optionalInputs = @(
    'apps/web/public'
  )

  if (-not $SkipLocalEnvValidation -and (Test-Path $LOCAL_API_ENV_FILE)) {
    $optionalInputs += $LOCAL_API_ENV_FILE
  }

  $missingRequired = $requiredInputs | Where-Object { -not (Test-Path $_) }
  if ($missingRequired.Count -gt 0) {
    throw "Missing required paths for archive: $($missingRequired -join ', ')"
  }

  $existingOptional = $optionalInputs | Where-Object { Test-Path $_ }
  $tarInputs = @($requiredInputs + $existingOptional)

  & tar -czf $archive @tarInputs
  if ($LASTEXITCODE -ne 0) {
    throw "Artifact creation failed with exit code $LASTEXITCODE"
  }

  # A BUILD_ID alone is not sufficient: an interrupted Next build can leave a
  # partial .next directory that starts but fails when a page is requested.
  # Verify the management landing route before any remote release is touched.
  $requiredWebArtifacts = @(
    'apps/web/.next/BUILD_ID',
    'apps/web/.next/server/app/dashboard/command-center/page.js'
  )
  foreach ($artifact in $requiredWebArtifacts) {
    if (-not (Test-Path $artifact)) {
      throw "Web build is incomplete: missing $artifact"
    }
    $contained = (& tar -tzf $archive | Select-String -SimpleMatch $artifact -Quiet)
    if (-not $contained) {
      throw "Deployment archive is incomplete: missing $artifact"
    }
  }

  $size = [math]::Round((Get-Item $archive).Length / 1MB, 2)
  Write-Host "Archive size: $size MB" -ForegroundColor Gray
}

# ====== Upload & deploy on Hostinger ======
Run "Upload archive to Hostinger" {
  ScpToHostinger $archive "/tmp/$archive"
  if ($LASTEXITCODE -ne 0) { throw "SCP upload failed with exit code $LASTEXITCODE" }
}

Run "Deploy on Hostinger (extract, install prod deps, restart PM2)" {
  $remoteEnvCopy = if (-not $SkipLocalEnvValidation -and (Test-Path $LOCAL_API_ENV_FILE) -and ($LOCAL_API_ENV_FILE -ne 'apps/api/.env')) {
    'if [ -f "' + $LOCAL_API_ENV_FILE + '" ]; then cp "' + $LOCAL_API_ENV_FILE + '" apps/api/.env; fi; '
  } else {
    ''
  }

  $remoteCmd =
    ('set -e; ' +
     'ARCHIVE=/tmp/' + $archive + '; ' +
     'DEPLOY_DIR=' + $REMOTE_PATH + '; ' +
     'mkdir -p "' + $REMOTE_PATH + '"; cd "' + $REMOTE_PATH + '"; ' +
     'test -s "$ARCHIVE"; ' +
     'tar -tzf "$ARCHIVE" | grep -qx "apps/web/.next/BUILD_ID"; ' +
     'tar -tzf "$ARCHIVE" | grep -qx "apps/web/.next/server/app/dashboard/command-center/page.js"; ' +
     'pm2 stop ' + $PM2_WEB_NAME + ' 2>/dev/null || true; ' +
     'if [ -d apps ]; then tar -czf backup-' + $stamp + '.tar.gz apps packages package.json pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null || true; fi; ' +
     'ls -1t backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f 2>/dev/null || true; ' +
     'for target in apps/web/.next apps/api/dist packages/hr-module/dist; do ' +
     '  if [ -e "$target" ]; then chmod -R u+rwX "$target" 2>/dev/null || true; rm -rf -- "$target"; fi; ' +
     '  if [ -e "$target" ]; then echo "Failed to remove $target" >&2; exit 1; fi; ' +
     'done; ' +
     'tar -xzf "$ARCHIVE" -C "$DEPLOY_DIR"; ' +
     'rm -f "$ARCHIVE"; ' +
     $remoteEnvCopy +
    'pnpm install --frozen-lockfile; ' +
    'cd packages/database; pnpm exec prisma generate --schema prisma/schema.prisma; cd "$DEPLOY_DIR"; ' +
    'pm2 delete ' + $PM2_API_NAME + ' 2>/dev/null || true; ' +
    'cd apps/api; PORT=' + $API_PORT + ' pm2 start npm --name ' + $PM2_API_NAME + ' -- run start:prod; cd "$DEPLOY_DIR"; ' +
    'pm2 delete ' + $PM2_WEB_NAME + ' 2>/dev/null || true; ' +
    'cd apps/web; ' +
    'if [ -f .next/BUILD_ID ]; then ' +
    '  PORT=' + $WEB_PORT + ' API_URL=http://127.0.0.1:' + $API_PORT + ' INTERNAL_API_URL=http://127.0.0.1:' + $API_PORT + '/api/v1 NEXT_PUBLIC_API_URL=/api/v1 pm2 start node_modules/next/dist/bin/next --name ' + $PM2_WEB_NAME + ' -- start -p ' + $WEB_PORT + '; ' +
    'else ' +
    '  PORT=' + $WEB_PORT + ' API_URL=http://127.0.0.1:' + $API_PORT + ' INTERNAL_API_URL=http://127.0.0.1:' + $API_PORT + '/api/v1 NEXT_PUBLIC_API_URL=/api/v1 pm2 start npm --name ' + $PM2_WEB_NAME + ' -- run dev -- -p ' + $WEB_PORT + '; ' +
    'fi; ' +
    'cd "$DEPLOY_DIR"; ' +
    'pm2 save; ' +
    'WEB_OK=0; for i in 1 2 3 4 5 6 7 8 9 10; do if curl -fs http://127.0.0.1:' + $WEB_PORT + '/ >/dev/null 2>&1 && curl -fs http://127.0.0.1:' + $WEB_PORT + '/dashboard/command-center >/dev/null 2>&1; then WEB_OK=1; break; fi; sleep 1; done; if [ "$WEB_OK" -eq 1 ]; then echo WEB_OK; else echo WEB_FAIL >&2; exit 1; fi; ' +
    'API_CODE=000; for i in 1 2 3 4 5 6 7 8 9 10; do API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:' + $API_PORT + '/api/v1 2>/dev/null || true); if [ "$API_CODE" != "000" ]; then break; fi; sleep 1; done; if [ "$API_CODE" != "000" ]; then echo API_OK_$API_CODE; else echo API_FAIL; fi; ' +
     'pm2 list')

  # Execute via bash -lc using single quotes (no CRLF issues)
  $escapedCmd = $remoteCmd.Replace("'", "'\\''")
  Invoke-Ssh "bash -lc '$escapedCmd'" | Out-Host
}

Run "Done" {
  Write-Host "`nDeployment Complete!" -ForegroundColor Green
  Write-Host "Environment: $Environment" -ForegroundColor Green
  Write-Host "Frontend: http://${HOSTINGER_IP}:$WEB_PORT" -ForegroundColor Green
  Write-Host "API:      http://${HOSTINGER_IP}:$API_PORT/api/v1" -ForegroundColor Green
  Write-Host "Domain:   https://$DOMAIN" -ForegroundColor Green
  Write-Host "API URL:  $API_BASE_URL" -ForegroundColor Green
  Write-Host "HR:       https://$DOMAIN/dashboard/hr" -ForegroundColor Green
  Write-Host "`nNext Steps:" -ForegroundColor Yellow
  Write-Host "1. Ensure DNS for $DOMAIN points to ${HOSTINGER_IP}" -ForegroundColor Gray
  Write-Host "2. Configure Nginx reverse proxy for $Environment environment" -ForegroundColor Gray
  Write-Host "3. Setup or renew Let's Encrypt certificates" -ForegroundColor Gray
  Write-Host "`nTip: Hard refresh (Ctrl+Shift+R)" -ForegroundColor Yellow
}
