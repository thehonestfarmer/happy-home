import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // This applies to /api/cron and all paths under it
        source: '/api/cron/:path*',
        headers: [
          {
            key: 'x-vercel-cron',
            // Use the environment variable
            value: process.env.VERCEL_CRON_SECRET || ''
          }
        ]
      }
    ]
  },
  serverExternalPackages: ['bull'],
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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
        port: '',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'bull'];
    }
    return config;
  },
};

export default nextConfig;
