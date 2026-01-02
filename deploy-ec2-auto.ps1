# Automated EC2 Deploy (artifact-based) — builds locally, uploads to EC2, restarts PM2
# - No git commit/push required
# - Avoids heavy builds on 2GB EC2 by building locally

$ErrorActionPreference = "Stop"

# ====== CONFIG (update if needed) ======
$EC2_IP = "3.110.100.60"
$EC2_USER = "ubuntu"
$KEY_PATH = ".\\saif-erp.pem"

# Remote deployment path (matches current server layout)
$REMOTE_PATH = "/home/ubuntu/sak-erp"

# PM2 process names (matches current server)
$PM2_API_NAME = "sak-api"
$PM2_WEB_NAME = "sak-web"

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
  & ssh.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=20 -i $KEY_PATH "$EC2_USER@$EC2_IP" $remoteCommand
}

function ScpToEC2($localPath, $remotePath) {
  & scp.exe -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=30 -i $KEY_PATH $localPath "$EC2_USER@${EC2_IP}:$remotePath"
}

# ====== Preconditions ======
Run "Preflight" {
  if (-not (Test-Path $KEY_PATH)) {
    throw "SSH key not found at: $KEY_PATH"
  }
  Assert-CommandExists "ssh"
  Assert-CommandExists "scp"
  Assert-CommandExists "pnpm"
  Assert-CommandExists "tar"
  Assert-CommandExists "git"

  Write-Host "Local repo: $(Get-Location)" -ForegroundColor Gray
  Write-Host "EC2: $EC2_USER@$EC2_IP" -ForegroundColor Gray
  Write-Host "Remote path: $REMOTE_PATH" -ForegroundColor Gray

  # Quick connectivity check
  Invoke-Ssh "echo ok; node -v; pnpm -v; pm2 -v" | Out-Host
}

# ====== Build locally ======
Run "Install deps (local)" {
  pnpm install --frozen-lockfile
}

Run "Build web (local)" {
  $previousApiUrl = $env:NEXT_PUBLIC_API_URL
  # Use a relative API base so browser requests go to :3000/api/v1/* and
  # Next.js rewrites proxy them to the API on :4000 (avoids hard-coded IPs/CORS).
  $env:NEXT_PUBLIC_API_URL = "/api/v1"

  pnpm -C apps/web build

  if ($null -ne $previousApiUrl) {
    $env:NEXT_PUBLIC_API_URL = $previousApiUrl
  } else {
    Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue
  }
}

Run "Build api (local)" {
  pnpm -C apps/api build
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

  $missingRequired = $requiredInputs | Where-Object { -not (Test-Path $_) }
  if ($missingRequired.Count -gt 0) {
    throw "Missing required paths for archive: $($missingRequired -join ', ')"
  }

  $existingOptional = $optionalInputs | Where-Object { Test-Path $_ }
  $tarInputs = @($requiredInputs + $existingOptional)

  & tar.exe -czf $archive @tarInputs

  $size = [math]::Round((Get-Item $archive).Length / 1MB, 2)
  Write-Host "Archive size: $size MB" -ForegroundColor Gray
}

# ====== Upload & deploy on EC2 ======
Run "Upload archive to EC2" {
  ScpToEC2 $archive "/tmp/$archive"
}

Run "Deploy on EC2 (extract, install prod deps, restart PM2)" {
  $remoteCmd =
    ('set -e; ' +
     'ARCHIVE=/tmp/' + $archive + '; ' +
     'DEPLOY_DIR=' + $REMOTE_PATH + '; ' +
     'mkdir -p "' + $REMOTE_PATH + '"; cd "' + $REMOTE_PATH + '"; ' +
     'pm2 stop sak-web 2>/dev/null || true; ' +
     'if [ -d apps ]; then tar -czf backup-' + $stamp + '.tar.gz apps packages package.json pnpm-workspace.yaml pnpm-lock.yaml 2>/dev/null || true; fi; ' +
     'ls -1t backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f 2>/dev/null || true; ' +
     'rm -rf apps/web/.next apps/api/dist packages/hr-module/dist 2>/dev/null || true; ' +
     'tar -xzf "$ARCHIVE" -C "$DEPLOY_DIR"; ' +
     'rm -f "$ARCHIVE"; ' +
     'pnpm install --prod --frozen-lockfile; ' +
     'pnpm dlx prisma@5.22.0 generate --schema packages/database/prisma/schema.prisma; ' +
    'pm2 delete ' + $PM2_API_NAME + ' 2>/dev/null || true; ' +
    'cd apps/api; pm2 start npm --name ' + $PM2_API_NAME + ' -- run start:prod; cd "$DEPLOY_DIR"; ' +
     'pm2 delete ' + $PM2_WEB_NAME + ' 2>/dev/null || true; ' +
     'cd apps/web; test -f .next/BUILD_ID; pm2 start node_modules/next/dist/bin/next --name ' + $PM2_WEB_NAME + ' -- start -p 3000; cd "$DEPLOY_DIR"; ' +
    'pm2 save; ' +
    'WEB_OK=0; for i in 1 2 3 4 5; do if curl -fsS http://127.0.0.1:3000/ >/dev/null; then WEB_OK=1; break; fi; sleep 2; done; if [ "$WEB_OK" -eq 1 ]; then echo WEB_OK; else echo WEB_FAIL; fi; ' +
    'API_CODE=000; for i in 1 2 3 4 5; do API_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/v1 || true); if [ "$API_CODE" != "000" ]; then break; fi; sleep 2; done; if [ "$API_CODE" != "000" ]; then echo API_OK_$API_CODE; else echo API_FAIL; fi; ' +
     'pm2 list')

  # Execute via bash -lc using single quotes (no CRLF issues)
  Invoke-Ssh "bash -lc '$($remoteCmd.Replace("'","'\\''"))'" | Out-Host
}

Run "Done" {
  Write-Host "Frontend: http://${EC2_IP}:3000" -ForegroundColor Green
  Write-Host "API:      http://${EC2_IP}:4000/api/v1" -ForegroundColor Green
  Write-Host "HR:       http://${EC2_IP}:3000/dashboard/hr" -ForegroundColor Green
  Write-Host "Tip: Hard refresh (Ctrl+Shift+R)" -ForegroundColor Yellow
}
