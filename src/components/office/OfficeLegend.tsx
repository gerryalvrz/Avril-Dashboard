'use client';

const ITEMS = [
  { key: 'spawning', cls: 'bg-blue-400' },
  { key: 'idle', cls: 'bg-slate-400' },
  { key: 'working', cls: 'bg-emerald-400' },
  { key: 'blocked', cls: 'bg-amber-400' },
  { key: 'completed', cls: 'bg-cyan-400' },
  { key: 'error', cls: 'bg-rose-400' },
];

export default function OfficeLegend() {
  return (
    <div className="glass px-3 py-2 rounded-xl flex flex-wrap gap-x-4 gap-y-2 text-xs">
      {ITEMS.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5 text-muted">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.cls}`} />
          <span>{item.key}</span>
        </div>
      ))}
    </div>
  );
}
