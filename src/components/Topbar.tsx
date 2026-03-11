'use client';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useWaaP } from './WaaPProvider';

const TITLES: Record<string, string> = {
  '/home': 'Home',
  '/verify': 'Verification',
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
    <header className="fixed top-0 left-0 md:left-64 right-0 h-16 glass-navbar flex items-center justify-between px-4 md:px-6 z-20">
      <div className="flex items-center gap-3">
        <button onClick={onOpenMenu} aria-label="Open menu" className="md:hidden text-lg text-muted hover:text-white smooth-transition">
          ☰
        </button>
        <h1 className="text-base font-semibold text-white font-heading">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <span className="text-xs text-muted hidden sm:inline">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Motus-DAO'}</span>
        {address && (
          <button
            onClick={() => void handleCopy()}
            className="btn-ghost text-xs"
          >
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
