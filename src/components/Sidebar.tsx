'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Cpu,
  Home,
  MessageSquare,
  UserRound,
  Wallet,
} from 'lucide-react';
import GlassIcons, { type GlassIconItem } from '@/components/ui/glass-icons';

const NAV_BASE: Array<{
  href: string;
  label: string;
  color: GlassIconItem['color'];
  icon: ReactNode;
}> = [
  { href: '/home', label: 'Home', color: 'cyan', icon: <Home className="w-5 h-5 text-white" /> },
  { href: '/profile', label: 'Profile', color: 'cyan', icon: <UserRound className="w-5 h-5 text-white" /> },
  { href: '/agents/office', label: 'Office', color: 'cyan', icon: <Building2 className="w-5 h-5 text-white" /> },
  { href: '/chats', label: 'Chats', color: 'cyan', icon: <MessageSquare className="w-5 h-5 text-white" /> },
  { href: '/wallets', label: 'Wallets', color: 'cyan', icon: <Wallet className="w-5 h-5 text-white" /> },
  { href: '/startup-agent-generator', label: 'Generator', color: 'cyan', icon: <Cpu className="w-5 h-5 text-white" /> },
];

function isNavActive(pathname: string, href: string) {
  if (href === '/agents') {
    return pathname.startsWith('/agents') && !pathname.startsWith('/agents/office');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavDrawerProps = {
  open: boolean;
  onClose: () => void;
};

/** Full-screen overlay with glass icon grid centered on the page (hamburger). */
export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items: GlassIconItem[] = NAV_BASE.map((item) => ({
    href: item.href,
    label: item.label,
    color: item.color,
    icon: item.icon,
    active: isNavActive(pathname, item.href),
  }));

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 top-16 bottom-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/45 backdrop-blur-md z-0"
        onClick={onClose}
      />

      <div
        id="nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nav-drawer-title"
        className="relative z-10 w-full max-w-lg rounded-2xl px-6 py-5 sm:px-8 sm:py-6 pointer-events-auto glass-nav-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl shrink-0" aria-hidden>
              ⚡
            </span>
            <h2 id="nav-drawer-title" className="text-lg font-bold tracking-tight text-white font-heading truncate">
              Avril Dashboard
            </h2>
          </div>
          <button
            type="button"
            className="shrink-0 p-2 rounded-xl text-muted hover:text-white hover:bg-white/10 smooth-transition border border-white/10"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex justify-center" aria-label="Main navigation">
          <GlassIcons
            items={items}
            columns={4}
            colorful
            onItemClick={onClose}
            className="justify-items-center w-full max-w-md mx-auto"
          />
        </nav>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-center">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block shrink-0" />
            Avril Agent · Online
          </div>
        </div>
      </div>
    </div>
  );
}
