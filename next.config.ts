import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.run.app", "*.asia-east1.run.app", "localhost", "127.0.0.1"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
