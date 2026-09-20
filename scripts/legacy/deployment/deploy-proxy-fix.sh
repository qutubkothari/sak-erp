# Connect to EC2 and deploy the proxy fix directly
ssh -i "saif-erp.pem" ubuntu@3.110.100.60 << 'ENDSSH'
cd /home/ubuntu/sak-erp

# Create the proxy route directory
mkdir -p "apps/web/src/app/api/v1/[...path]"

# Create the route handler
cat > "apps/web/src/app/api/v1/[...path]/route.ts" << 'EOFTS'
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getApiOrigin(): string {
  const configured = process.env.API_URL || 'http://127.0.0.1:4000';
  return configured.replace(/\/api\/v1\/?$/, '');
}

async function proxy(request: Request, pathSegments: string[]) {
  const apiOrigin = getApiOrigin();
  const incomingUrl = new URL(request.url);

  const targetUrl = new URL(apiOrigin);
  targetUrl.pathname = `/api/v1/${pathSegments.join('/')}`;
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  const response = await fetch(targetUrl.toString(), {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}
export async function POST(request: Request, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}
export async function PUT(request: Request, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}
export async function PATCH(request: Request, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}
export async function DELETE(request: Request, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}
export async function OPTIONS(request: Request, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}
export async function HEAD(request: Request, context: { params: { path: string[] } }) {
  return proxy(request, context.params.path);
}
EOFTS

echo " Proxy route created"

# Also update main.ts to bind to 0.0.0.0 if not already done
if ! grep -q "await app.listen(port, '0.0.0.0')" apps/api/src/main.ts; then
  sed -i "s/await app.listen(port);/await app.listen(port, '0.0.0.0');/" apps/api/src/main.ts
  echo " Updated main.ts to bind on 0.0.0.0"
  pm2 restart sak-api
fi

# Restart web server
echo " Restarting sak-web..."
pm2 restart sak-web

# Wait for restart
sleep 5

echo ""
echo " Deployment complete!"
echo ""
echo " PM2 Status:"
pm2 list

echo ""
echo " Testing proxy..."
curl -I "http://localhost:3000/api/v1/inventory/items/bce6e6de-3c69-4628-8054-be1eb0023d77" 2>&1 | head -n 5

ENDSSH
