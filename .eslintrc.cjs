module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  ignorePatterns: [
    '.next/**',
    'node_modules/**',
    'convex/_generated/**',
    // Vendor contracts ship their own .eslintrc (e.g. prettier extend); do not lint.
    'lib/**',
  ],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};
