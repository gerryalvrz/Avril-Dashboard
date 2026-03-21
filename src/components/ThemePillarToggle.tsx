'use client';

import { useUIStore } from '@/src/lib/store';

export default function ThemePillarToggle() {
  const { theme, setTheme } = useUIStore();

  const handleCycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('matrix');
    else setTheme('light');
  };

  const dotBase =
    'w-2 h-2 rounded-full border border-white/20 bg-white/10 transition-colors transition-transform duration-200';

  return (
    <div className="flex items-center gap-2">
      {/* Main cycle button */}
      <button
        type="button"
        onClick={handleCycle}
        aria-label="Cycle theme"
        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center border border-white/20 rounded-lg bg-surface-raised text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
      >
        <span className="text-sm md:text-base">Theme</span>
      </button>

      <div className="h-16 md:h-20 w-7 flex items-center justify-center">
        <div className="h-full w-[2px] bg-gradient-to-b from-white/10 via-white/20 to-white/10 rounded-full relative flex flex-col items-center justify-between py-2">
          <button
            type="button"
            aria-label="Light theme"
            onClick={() => setTheme('light')}
            className={`${dotBase} ${theme === 'light' ? 'bg-white/90 border-white scale-110' : ''}`}
          />
          <button
            type="button"
            aria-label="Dark theme"
            onClick={() => setTheme('dark')}
            className={`${dotBase} ${theme === 'dark' ? 'bg-white/90 border-white scale-110' : ''}`}
          />
          <button
            type="button"
            aria-label="Matrix theme"
            onClick={() => setTheme('matrix')}
            className={`${dotBase} ${
              theme === 'matrix' ? 'bg-accent border-accent shadow-[0_0_10px_rgba(99,102,241,0.55)] scale-125' : ''
            }`}
          />
        </div>
      </div>
    </div>
  );
}

