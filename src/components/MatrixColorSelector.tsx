'use client';

import { useUIStore, type MatrixColor } from '@/src/lib/store';

const colorOptions: { value: MatrixColor; label: string; className: string; glow: string }[] = [
  { value: 'green', label: 'Verde', className: 'bg-[#39ff14]', glow: '0 0 20px #39ff14, 0 0 40px #39ff14' },
  { value: 'red', label: 'Rojo', className: 'bg-[#ff1744]', glow: '0 0 20px #ff1744, 0 0 40px #ff1744' },
  { value: 'orange', label: 'Naranja', className: 'bg-[#ff9100]', glow: '0 0 20px #ff9100, 0 0 40px #ff9100' },
  { value: 'blue', label: 'Azul', className: 'bg-[#00e5ff]', glow: '0 0 20px #00e5ff, 0 0 40px #00e5ff' },
  { value: 'pink', label: 'Rosa', className: 'bg-[#ff10f0]', glow: '0 0 20px #ff10f0, 0 0 40px #ff10f0' },
];

export default function MatrixColorSelector() {
  const { matrixColor, setMatrixColor } = useUIStore();

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Matrix theme color</label>
      <div className="grid grid-cols-5 gap-3">
        {colorOptions.map((option) => {
          const active = matrixColor === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setMatrixColor(option.value)}
              className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 focus:outline-none ${
                active ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/60'
              }`}
              aria-label={`Select ${option.label} Matrix color`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${option.className}`}
                style={{
                  boxShadow: active ? option.glow : '0 4px 12px rgba(0,0,0,0.3)',
                }}
              />
              <span className="text-xs font-medium text-center">{option.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        Personaliza el color del modo Matrix. Los cambios se aplican al instante y se guardan en este navegador.
      </p>
    </div>
  );
}

