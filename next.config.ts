import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Disable ESLint during production builds (on Vercel)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Your existing Webpack fallbacks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        assert: false,
        url: false,
      };
    }

    return config;
  },
};

export default nextConfig;
