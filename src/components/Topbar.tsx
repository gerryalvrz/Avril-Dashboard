'use client';
import { usePathname } from 'next/navigation';

const TITLES: Record<string, string> = {
  '/home': 'Home',
  '/agents': 'Agents',
  '/tasks': 'Tasks',
  '/chats': 'Chats',
  '/wallets': 'Wallets',
};

export default function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? 'AgentDashboard';
  return (
    <header className="fixed top-0 left-56 right-0 h-14 bg-panel/80 backdrop-blur border-b border-border flex items-center justify-between px-6 z-20">
      <h1 className="text-base font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted">Motus-DAO</span>
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
          AM
        </div>
      </div>
    </header>
  );
}
