import { auth } from './auth';

export default auth((req) => {
  // Just check if user is authenticated
  if (!req.auth && req.nextUrl.pathname.startsWith('/performance')) {
    return Response.redirect(new URL('/auth/login', req.url));
  }
});

export const config = {
  matcher: [
    '/performance/:path*',
  ],
};
