'use client';
import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/home': 'Home',
  '/agents': 'Agents',
  '/tasks': 'Tasks',
  '/chats': 'Chats',
  '/wallets': 'Wallets',
};

type TopbarProps = {
  onOpenMenu: () => void;
};

export default function Topbar({ onOpenMenu }: TopbarProps) {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? 'AgentDashboard';

  return (
    <header className="fixed top-0 left-0 md:left-56 right-0 h-14 bg-panel/80 backdrop-blur border-b border-border flex items-center justify-between px-4 md:px-6 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="md:hidden text-lg text-muted hover:text-white"
        >
          ☰
        </button>
        <h1 className="text-base font-semibold text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-xs text-muted hidden sm:inline">Motus-DAO</span>
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
          AM
        </div>
      </div>
    </header>
  );
}
