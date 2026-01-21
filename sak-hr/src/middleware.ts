import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Role = 'hr' | 'manager' | 'employee';

const managerAllowed = [
  '/api/evaluations',
  '/api/evaluations/',
  '/api/feedback-requests',
  '/api/feedback-requests/',
  '/api/feedback-responses',
  '/api/feedback-responses/',
  '/api/improvement-plans',
  '/api/improvement-plans/',
];

const employeeAllowed = ['/api/feedback-responses', '/api/feedback-responses/'];

const matchesPrefix = (path: string, prefixes: string[]) =>
  prefixes.some((prefix) => path === prefix || path.startsWith(prefix));

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (request.method === 'GET') {
    return NextResponse.next();
  }

  const role = (request.cookies.get('hr_role')?.value ?? 'employee') as Role;

  if (role === 'hr') {
    return NextResponse.next();
  }

  if (role === 'manager' && matchesPrefix(pathname, managerAllowed)) {
    return NextResponse.next();
  }

  if (role === 'employee' && matchesPrefix(pathname, employeeAllowed)) {
    return NextResponse.next();
  }

  return new NextResponse('Forbidden', { status: 403 });
}

export const config = {
  matcher: ['/api/:path*'],
};
