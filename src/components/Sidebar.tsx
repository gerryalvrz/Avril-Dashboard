'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/profile', label: 'Profile', icon: '🧑‍🚀' },
  { href: '/verify', label: 'Verification', icon: '✅' },
  { href: '/agents', label: 'Agents', icon: '🤖' },
  { href: '/agents/office', label: 'Agent Office', icon: '🏢' },
  { href: '/tasks', label: 'Tasks', icon: '📋' },
  { href: '/chats', label: 'Chats', icon: '💬' },
  { href: '/wallets', label: 'Wallets', icon: '🔐' },
];

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen w-64 glass-sidebar flex flex-col py-6 px-3 z-40 transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center justify-between gap-2 px-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="text-lg font-bold tracking-tight text-white font-heading">AgentDashboard</span>
          </div>
          <button
            className="md:hidden text-muted hover:text-white"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all smooth-transition ${
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

        <div className="px-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            AgentMotus · Online
          </div>
        </div>
      </aside>
    </>
  );
}
