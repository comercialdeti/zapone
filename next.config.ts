import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['zapone.pt'],
  },
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
