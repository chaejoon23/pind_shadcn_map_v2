import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable for Google Maps compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
