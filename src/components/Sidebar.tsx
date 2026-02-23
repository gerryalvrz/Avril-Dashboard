'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/agents', label: 'Agents', icon: '🤖' },
  { href: '/tasks', label: 'Tasks', icon: '📋' },
  { href: '/chats', label: 'Chats', icon: '💬' },
  { href: '/wallets', label: 'Wallets', icon: '🔐' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-panel border-r border-border flex flex-col py-6 px-3 z-30">
      <div className="flex items-center gap-2 px-3 mb-8">
        <span className="text-2xl">⚡</span>
        <span className="text-lg font-bold tracking-tight text-white">AgentDashboard</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          AgentMotus · Online
        </div>
      </div>
    </aside>
  );
}
