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
    'w-1.5 h-1.5 rounded-full border border-white/20 bg-white/10 transition-colors transition-transform duration-200';

  return (
    <div className="flex items-center gap-2">
      {/* Main lightning button */}
      <button
        type="button"
        onClick={handleCycle}
        aria-label="Cycle theme"
        className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center border border-white/60 rounded-md bg-black/90 shadow-[0_0_16px_rgba(0,0,0,0.8)]"
      >
        <span className="text-lg md:text-xl text-[#39ff14]">⚡</span>
      </button>

      {/* Vertical pillar with three dots */}
      <div className="h-16 md:h-20 w-7 flex items-center justify-center">
        <div className="h-full w-[2px] bg-gradient-to-b from-white/10 via-white/25 to-white/10 rounded-full relative flex flex-col items-center justify-between py-2">
          <button
            type="button"
            aria-label="Light theme"
            onClick={() => setTheme('light')}
            className={`${dotBase} ${theme === 'light' ? 'bg-white/80 border-white scale-110' : ''}`}
          />
          <button
            type="button"
            aria-label="Dark theme"
            onClick={() => setTheme('dark')}
            className={`${dotBase} ${theme === 'dark' ? 'bg-white/80 border-white scale-110' : ''}`}
          />
          <button
            type="button"
            aria-label="Matrix theme"
            onClick={() => setTheme('matrix')}
            className={`${dotBase} ${
              theme === 'matrix' ? 'bg-[#39ff14] border-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.8)] scale-125' : ''
            }`}
          />
        </div>
      </div>
    </div>
  );
}

