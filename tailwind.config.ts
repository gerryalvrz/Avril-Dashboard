import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0b1020',
        panel: '#111827',
        border: '#1e293b',
        accent: '#6366f1',
        'accent-hover': '#818cf8',
        muted: '#94a3b8',
      }
    }
  },
  plugins: []
};
export default config;
