#!/bin/bash
# Deploy API Proxy Fix to EC2 - Fixes BOM Edit ItemSearch 404 errors
# Run this on EC2: ssh -i "saif-erp.pem" ubuntu@3.110.100.60

set -e

echo "🚀 Deploying API Proxy Fix to EC2..."

# Navigate to app directory
cd /home/ubuntu/sak-erp

# Create the catch-all proxy route directory
echo "📁 Creating proxy route directory..."
mkdir -p "apps/web/src/app/api/v1/[...path]"

# Create the proxy route handler
echo "📝 Creating proxy route handler..."
cat > "apps/web/src/app/api/v1/[...path]/route.ts" <<'EOF'
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
EOF

echo "✓ Proxy route created"

# Update API main.ts to bind on 0.0.0.0 (if not already done)
echo "🔧 Updating API to bind on 0.0.0.0..."
sed -i "s/await app.listen(port);/await app.listen(port, '0.0.0.0');/" apps/api/src/main.ts 2>/dev/null || true

# Restart the web service
echo "🔄 Restarting sak-web..."
pm2 restart sak-web

# Wait for restart
sleep 3

# Show status
echo ""
echo "✅ Deployment Complete!"
echo ""
pm2 status

echo ""
echo "🧪 Testing proxy..."
echo ""
curl -s -o /dev/null -w "Status: %{http_code}\n" "http://localhost:3000/api/v1/inventory/items/test-id" || true

echo ""
echo "✅ If you see 'Status: 401', the proxy is working!"
echo "✅ If you see 'Status: 404', there may be an issue."
echo ""
echo "📊 Now test BOM edit screen in browser - ItemSearch should populate names"
