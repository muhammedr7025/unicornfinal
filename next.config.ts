import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: '*.supabase.co' },
    ],
  },
  serverExternalPackages: ['@react-pdf/renderer', 'xlsx'],
};

export default nextConfig;
