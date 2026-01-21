param(
    [string]$Message = "Deploy SAK HR"
)

$ErrorActionPreference = "Stop"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   SAK HR TO HOSTINGER DEPLOYMENT" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan

# ====== CONFIG ======
$HOSTINGER_IP = "72.62.192.228"
$HOSTINGER_USER = "qutubk"
$KEY_PATH = "$env:USERPROFILE\.ssh\hostinger_ed25519"
$REMOTE_PATH = "/var/www/sak-hr"
$PM2_PROCESS = "sak-hr"
$REPO_URL = "https://github.com/qutubkothari/sak-erp.git"
$BRANCH = "main"
$APP_PORT = "8060"

function Test-SshKey {
    if (-not (Test-Path $KEY_PATH)) {
        Write-Host "ERROR: SSH key not found at: $KEY_PATH" -ForegroundColor Red
        throw "SSH key missing"
    }
    Write-Host "SSH key found" -ForegroundColor Green
}

function Invoke-RemoteCommand {
    param([string]$Command)
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Remote command failed"
    }
}

Write-Host "[1/8] Pre-deployment Checks" -ForegroundColor Yellow
Test-SshKey
git status --short

Write-Host "`n[2/8] Git Commit and Push" -ForegroundColor Yellow
git add .
git commit -m "$Message"
if ($LASTEXITCODE -ne 0) {
    Write-Host "No changes to commit" -ForegroundColor Yellow
}

git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git push failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Code pushed to GitHub" -ForegroundColor Green

Write-Host "`n[3/8] Testing Connection" -ForegroundColor Yellow
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -i $KEY_PATH "$HOSTINGER_USER@$HOSTINGER_IP" "echo 'Connected'; node -v; pm2 -v"
Write-Host "Connection OK" -ForegroundColor Green

Write-Host "`n[4/8] Preparing Remote Repo" -ForegroundColor Yellow
$prepCmd = @'
if [ ! -d "{0}" ]; then
  mkdir -p "{0}";
  git clone {1} "{0}";
fi
cd "{0}"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo 'ERROR: Remote path exists but is not a git repo.'; exit 1;
fi
origin_url=$(git remote get-url origin || echo '')
if [ "$origin_url" != "{1}" ]; then
  echo "ERROR: Remote repo mismatch at {0}"; exit 1;
fi
git fetch origin {2}
git checkout {2}
git pull origin {2}
'@ -f $REMOTE_PATH, $REPO_URL, $BRANCH
Invoke-RemoteCommand $prepCmd
Write-Host "Code updated on server" -ForegroundColor Green

Write-Host "`n[5/8] Installing Dependencies" -ForegroundColor Yellow
$depsCmd = @'
cd "{0}"
if ! command -v pnpm >/dev/null 2>&1; then
  npm i -g pnpm
fi
pnpm install
'@ -f $REMOTE_PATH
Invoke-RemoteCommand $depsCmd
Write-Host "Dependencies updated" -ForegroundColor Green

Write-Host "`n[6/8] Start Local DB (Docker)" -ForegroundColor Yellow
$dockerCmd = @'
cd "{0}"
if ! command -v docker >/dev/null 2>&1; then
  echo 'ERROR: Docker not installed on server.'; exit 1;
fi
if ! command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  echo 'ERROR: Docker Compose not available.'; exit 1;
fi
if [ ! -f .env ]; then
  cat <<EOF > .env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
DATABASE_URL=postgresql://sak_hr:sak_hr_password@localhost:5433/sak_hr?schema=public
EOF
fi
docker compose up -d
'@ -f $REMOTE_PATH
Invoke-RemoteCommand $dockerCmd
Write-Host "Docker database running" -ForegroundColor Green

Write-Host "`n[7/8] Prisma Migrations" -ForegroundColor Yellow
$prismaCmd = @'
cd "{0}"
pnpm prisma generate
pnpm prisma migrate deploy || pnpm prisma db push
'@ -f $REMOTE_PATH
Invoke-RemoteCommand $prismaCmd
Write-Host "Prisma updated" -ForegroundColor Green

Write-Host "`n[8/8] Build and Restart" -ForegroundColor Yellow
$restartCmd = @'
cd "{0}"
pnpm build
PORT={1} NODE_ENV=production pm2 start pnpm --name {2} -- start || pm2 restart {2} --update-env
pm2 save
pm2 list
'@ -f $REMOTE_PATH, $APP_PORT, $PM2_PROCESS
Invoke-RemoteCommand $restartCmd
Write-Host "Application restarted" -ForegroundColor Green

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "===================================================`n" -ForegroundColor Cyan
Write-Host "Live port: $APP_PORT" -ForegroundColor Cyan
Write-Host "Check logs: pm2 logs $PM2_PROCESS" -ForegroundColor Gray
Write-Host ""
