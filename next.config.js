/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Your ESLint configuration is preserved
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ Your essential Webpack configuration is preserved
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

// --- FIX: Using the correct JavaScript export syntax ---
module.exports = nextConfig;