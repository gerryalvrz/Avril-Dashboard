'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/src/lib/store';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, matrixColor } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme');
    root.removeAttribute('data-matrix-color');

    if (theme === 'matrix') {
      root.setAttribute('data-theme', 'matrix');
      root.setAttribute('data-matrix-color', matrixColor);
    } else {
      root.classList.add(theme);
    }
  }, [theme, matrixColor]);

  return <>{children}</>;
}

