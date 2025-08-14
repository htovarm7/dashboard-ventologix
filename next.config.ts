import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Configurar aliases para resolver imports
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
  // Asegurarse de que no hay basePath configurado
  basePath: '',
};

export default nextConfig;
