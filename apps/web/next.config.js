/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Multi-language support
  i18n: {
    locales: ['en', 'hi', 'bn', 'te'],
    defaultLocale: 'en',
  },

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
};

module.exports = nextConfig;
