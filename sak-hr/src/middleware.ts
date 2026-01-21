export { auth as middleware } from './auth';

export const config = {
  matcher: [
    '/performance/:path*',
    '/api/appraisal-letters/:path*',
    '/api/competencies/:path*',
    '/api/evaluations/:path*',
    '/api/kpis/:path*',
    '/api/notifications/:path*',
    '/api/reports/:path*',
    '/api/review-cycles/:path*',
  ],
};
