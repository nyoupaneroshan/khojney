import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add your webpack configuration here to handle Node.js modules in client bundles
  webpack: (config, { isServer }) => {
    // Only apply fallbacks for the client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        fs: false, // Prevents 'fs' from being bundled on the client
        net: false, // Prevents 'net' from being bundled
        tls: false, // Prevents 'tls' from being bundled
        child_process: false, // Prevents 'child_process' from being bundled
        // You might need to add other Node.js modules here if similar errors occur for them:
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        assert: false,
        url: false,
      };
    }

    // Important: return the modified config
    return config;
  },
};

export default nextConfig;