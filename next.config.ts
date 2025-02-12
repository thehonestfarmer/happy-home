import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    scrollRestoration: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.shiawasehome-reuse.com',
        pathname: '/wp-content/uploads/**',
        port: '',
      },
    ],
  },
};

export default nextConfig;
