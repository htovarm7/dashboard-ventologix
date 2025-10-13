/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': '.',
      '@/components': './components',
      '@/lib': './lib',
      '@/data': './data',
      '@/types': './types',
    };
    return config;
  },
  basePath: '',
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/web/**',
      },
      {
        protocol: 'https',
        hostname: 'api.ventologix.com',
        port: '',
        pathname: '/web/**',
      }
    ],
  },
};

module.exports = nextConfig;