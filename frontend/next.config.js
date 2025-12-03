/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
    // First, remove any existing WASM rules to prevent double processing
    config.module.rules = config.module.rules.filter(
      rule => !rule.test?.toString().includes('wasm')
    );

    // Configure WASM as raw files to be served from public, not parsed
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name].[hash:8][ext]',
      },
    });

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      global: 'global',
    };

    // Add polyfill for global object
    config.plugins.push(
      new (require('webpack').DefinePlugin)({
        global: 'globalThis',
      })
    );

    // Suppress circular dependency warnings from @zama-fhe/relayer-sdk
    // These are internal to the SDK and don't affect functionality
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        message: /Circular dependency between chunks with runtime/,
      },
    ];

    return config;
  },
};

module.exports = nextConfig;