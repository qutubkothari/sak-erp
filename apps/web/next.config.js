const enableStandalone = process.env.NEXT_STANDALONE === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: enableStandalone ? 'standalone' : undefined,
  
  // Disable static page generation to avoid SSR context issues
  // Multi-language support disabled temporarily
  // i18n: {
  //   locales: ['en', 'hi', 'bn', 'te'],
  //   defaultLocale: 'en',
  // },

  // Environment variables
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
  },

  // Image optimization
  images: {
    domains: ['localhost'],
  },

  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  async rewrites() {
    // Proxy browser calls like /api/v1/... (to :3000) over to the Nest API (:4000).
    // This avoids hard-coding public IPs and avoids CORS.
    const configured = process.env.API_URL || 'http://127.0.0.1:4000';
    const apiOrigin = configured.replace(/\/api\/v1\/?$/, '');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
