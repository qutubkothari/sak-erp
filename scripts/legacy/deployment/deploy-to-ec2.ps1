# Deploy API Proxy Fix to EC2
param(
    [string]$KeyPath = ""
)

$EC2_HOST = "3.110.100.60"
$EC2_USER = "ubuntu"

# PEM key path - SET DIRECTLY
$KeyPath = "C:\Users\musta\OneDrive\Documents\GitHub\Manufacturing ERP\saif-erp.pem"

if (-not (Test-Path $KeyPath)) {
    Write-Host "ERROR: Key file not found at: $KeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Using key: $KeyPath" -ForegroundColor Green
Write-Host ""
Write-Host "Deploying API proxy fix to EC2..." -ForegroundColor Cyan

# Create bash script content
$bashScript = @"
cd /home/ubuntu/sak-erp
mkdir -p 'apps/web/src/app/api/v1/[...path]'
cat > 'apps/web/src/app/api/v1/[...path]/route.ts' << 'ENDOFFILE'
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getApiOrigin(): string {
  const configured = process.env.API_URL || 'http://127.0.0.1:4000';
  return configured.replace(/\/api\/v1\/?`$/, '');
}

async function proxy(request: Request, pathSegments: string[]) {
  const apiOrigin = getApiOrigin();
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(apiOrigin);
  targetUrl.pathname = ``/api/v1/`${pathSegments.join('/')}``;
  targetUrl.search = incomingUrl.search;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');
  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  const response = await fetch(targetUrl.toString(), { method, headers, body, redirect: 'manual' });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: responseHeaders });
}

export async function GET(request: Request, context: { params: { path: string[] } }) { return proxy(request, context.params.path); }
export async function POST(request: Request, context: { params: { path: string[] } }) { return proxy(request, context.params.path); }
export async function PUT(request: Request, context: { params: { path: string[] } }) { return proxy(request, context.params.path); }
export async function PATCH(request: Request, context: { params: { path: string[] } }) { return proxy(request, context.params.path); }
export async function DELETE(request: Request, context: { params: { path: string[] } }) { return proxy(request, context.params.path); }
export async function OPTIONS(request: Request, context: { params: { path: string[] } }) { return proxy(request, context.params.path); }
export async function HEAD(request: Request, context: { params: { path: string[] } }) { return proxy(request, context.params.path); }
ENDOFFILE

echo "Proxy route created"
pm2 restart sak-web
sleep 3
echo ""
echo "Deployment Complete!"
pm2 status
echo ""
echo "Testing proxy..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "http://localhost:3000/api/v1/inventory/items/test"
echo ""
echo "If status is 401, proxy is working correctly"
"@

# Execute on EC2
ssh -i $KeyPath -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" $bashScript

Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Open http://${EC2_HOST}:3000/dashboard/bom and check if ItemSearch works" -ForegroundColor Cyan
