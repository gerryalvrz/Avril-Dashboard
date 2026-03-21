'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'matrix';
export type MatrixColor = 'green' | 'red' | 'orange' | 'blue' | 'pink';

type UIStoreState = {
  theme: ThemeMode;
  matrixColor: MatrixColor;
  setTheme: (theme: ThemeMode) => void;
  setMatrixColor: (color: MatrixColor) => void;
};

const UIStoreContext = createContext<UIStoreState | undefined>(undefined);

const THEME_KEY = 'avril-dashboard:theme';
const MATRIX_COLOR_KEY = 'avril-dashboard:matrix-color';

function applyThemeToDocument(theme: ThemeMode, matrixColor: MatrixColor) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.classList.remove('light', 'dark');
  root.removeAttribute('data-theme');
  root.removeAttribute('data-matrix-color');

  if (theme === 'matrix') {
    root.setAttribute('data-theme', 'matrix');
    root.setAttribute('data-matrix-color', matrixColor);
  } else {
    root.classList.add(theme);
  }
}

export function UIStoreProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [matrixColor, setMatrixColorState] = useState<MatrixColor>('green');

  useEffect(() => {
    let initialTheme: ThemeMode = 'dark';
    let initialColor: MatrixColor = 'green';

    try {
      const storedTheme = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
      if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'matrix') {
        initialTheme = storedTheme;
      }
      const storedColor = window.localStorage.getItem(MATRIX_COLOR_KEY) as MatrixColor | null;
      if (storedColor && ['green', 'red', 'orange', 'blue', 'pink'].includes(storedColor)) {
        initialColor = storedColor;
      }
    } catch {
      // ignore
    }

    setThemeState(initialTheme);
    setMatrixColorState(initialColor);
    applyThemeToDocument(initialTheme, initialColor);
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme, matrixColor);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
      window.localStorage.setItem(MATRIX_COLOR_KEY, matrixColor);
    } catch {
      // ignore
    }
  }, [theme, matrixColor]);

  const value = useMemo<UIStoreState>(
    () => ({
      theme,
      matrixColor,
      setTheme: (t) => setThemeState(t),
      setMatrixColor: (c) => setMatrixColorState(c),
    }),
    [theme, matrixColor]
  );

  return <UIStoreContext.Provider value={value}>{children}</UIStoreContext.Provider>;
}

export function useUIStore(): UIStoreState {
  const ctx = useContext(UIStoreContext);
  if (!ctx) {
    throw new Error('useUIStore must be used within a UIStoreProvider');
  }
  return ctx;
}

