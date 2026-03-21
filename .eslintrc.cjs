module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  ignorePatterns: ['.next/**', 'node_modules/**', 'convex/_generated/**'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
};
