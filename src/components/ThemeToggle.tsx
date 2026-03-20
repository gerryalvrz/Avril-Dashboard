'use client';

import { useUIStore } from '@/src/lib/store';
 
export default function ThemeToggle() {
  const { theme, setTheme } = useUIStore();

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-black/40 border border-white/10 px-1 py-0.5 text-[11px]">
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`px-2 py-0.5 rounded-full smooth-transition ${
          theme === 'dark' ? 'bg-white text-black font-semibold' : 'text-muted hover:text-white'
        }`}
      >
        Dark
      </button>
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`px-2 py-0.5 rounded-full smooth-transition ${
          theme === 'light' ? 'bg-white text-black font-semibold' : 'text-muted hover:text-white'
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme('matrix')}
        className={`px-2 py-0.5 rounded-full smooth-transition font-matrix ${
          theme === 'matrix' ? 'bg-white text-black font-semibold' : 'text-muted hover:text-white'
        }`}
      >
        Matrix
      </button>
    </div>
  );
}

