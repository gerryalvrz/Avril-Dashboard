'use client';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useWaaP } from './WaaPProvider';
import ThemePillarToggle from './ThemePillarToggle';

const TITLES: Record<string, string> = {
  '/home': 'Menu',
  '/verify': 'Verification',
  '/agents': 'Agents',
  '/agents/office': 'Agent Office',
  '/tasks': 'Tasks',
  '/chats': 'Chats',
  '/wallets': 'Wallets',
  '/startup-agent-generator': 'Startup Agent Generator',
  '/profile': 'Profile',
};

type TopbarProps = {
  menuOpen: boolean;
  onMenuToggle: () => void;
};

export default function Topbar({ menuOpen, onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const title =
    TITLES[pathname] ??
    (pathname.startsWith('/agents/office') ? 'Agent Office' : undefined) ??
    (pathname.startsWith('/agents') ? 'Agents' : undefined) ??
    'Avril Dashboard';
  const { address, logout } = useWaaP();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 glass-navbar flex items-center justify-between px-4 md:px-6 z-[60]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-drawer"
          className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/10 smooth-transition border border-white/10"
        >
          <Menu className="w-5 h-5" strokeWidth={2} aria-hidden />
        </button>
        <h1 className="text-base font-semibold text-white font-heading">{title}</h1>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <ThemePillarToggle />
        <span className="text-xs text-muted hidden sm:inline">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Avril'}
        </span>
        {address && (
          <button onClick={() => void handleCopy()} className="btn-ghost text-xs">
            {copied ? 'Copied' : 'Copy address'}
          </button>
        )}
        <button onClick={() => void logout()} className="btn-ghost text-xs">
          Logout
        </button>
      </div>
    </header>
  );
}
