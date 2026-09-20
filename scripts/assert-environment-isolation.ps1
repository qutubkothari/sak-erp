param(
  [string]$KeyPath = "$env:USERPROFILE\.ssh\hostinger_ed25519"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH key not found: $KeyPath"
}

$checks = @(
  @{
    Name = 'SaifSeas live'
    Target = 'live'
    Host = '72.62.192.228'
    User = 'qutubk'
    Root = '/var/www/sak-erp'
    Api = 'sak-api'
    Web = 'sak-web'
    ApiPort = '4000'
    WebPort = '3000'
    Url = 'https://erp.saifseas.com'
    Ref = 'xjiyiywzmklljrpblcqj'
  },
  @{
    Name = 'Mizantra test'
    Target = 'test'
    Host = '200.141.1.206'
    User = 'root'
    Root = '/var/www/sak-erp-test'
    Api = 'sak-api-test'
    Web = 'sak-web-test'
    ApiPort = '4001'
    WebPort = '3001'
    Url = 'https://mizantra.saksolution.com'
    Ref = 'nwkaruzvzwwuftjquypk'
  }
)

$results = @()
foreach ($check in $checks) {
  $remoteTarget = "$($check.User)@$($check.Host)"
  $command = "cd '$($check.Root)' && node scripts/assert-deployment-target.cjs --target '$($check.Target)' --host '$($check.Host)' --ssh-user '$($check.User)' --app-root '$($check.Root)' --api-process '$($check.Api)' --web-process '$($check.Web)' --api-port '$($check.ApiPort)' --web-port '$($check.WebPort)' --public-url '$($check.Url)'"
  $output = & ssh.exe -i $KeyPath -o BatchMode=yes -o ConnectTimeout=15 $remoteTarget $command
  if ($LASTEXITCODE -ne 0) {
    throw "$($check.Name) environment verification failed."
  }
  $jsonLine = $output | Where-Object { $_ -match '^\{' } | Select-Object -Last 1
  if (-not $jsonLine) {
    throw "$($check.Name) returned an invalid deployment identity response."
  }
  $result = $jsonLine | ConvertFrom-Json
  if ($result.databaseProjectRef -ne $check.Ref) {
    throw "$($check.Name) resolved to unexpected database project $($result.databaseProjectRef)."
  }
  $results += $result
}

if ($results[0].databaseProjectRef -eq $results[1].databaseProjectRef) {
  throw 'DEPLOYMENT BLOCKED: live and test resolve to the same database project.'
}

$results | ForEach-Object {
  Write-Host "$($_.name): target=$($_.target), host=$($_.host), database=$($_.databaseProjectRef), path=$($_.appRoot)"
}
Write-Host 'Environment isolation verified: live and test databases are different.' -ForegroundColor Green
