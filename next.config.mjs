const nextConfig = {
  reactStrictMode: true,
  // Default Next ESLint dirs include `lib/`; vendor contracts have their own .eslintrc (prettier) and break CI.
  eslint: {
    dirs: ['app', 'src', 'components', 'convex'],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@base-org/account/dist/index.node.js': '@base-org/account/dist/index.js',
      '@base-org/account/dist/interface/payment/index.node.js':
        '@base-org/account/dist/interface/payment/index.js',
      '@base-org/account/node': '@base-org/account/browser',
    };

    return config;
  },
};

export default nextConfig;
