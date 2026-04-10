import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['zapone.pt'],
  },
  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'bullmq',
    'ioredis',
    'socket.io',
    'socket.io-client',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
