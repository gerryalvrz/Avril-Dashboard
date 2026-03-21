'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavDrawer from './Sidebar';
import Topbar from './Topbar';
import { useWaaP } from './WaaPProvider';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isReady, isAuthenticated, login, address } = useWaaP();
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      router.replace('/home');
    }
  }, [isAuthenticated, router]);

  if (!isReady) {
    return <main className="min-h-screen grid place-items-center text-sm text-muted font-sans">Initializing WaaP…</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md glass p-8 text-center">
          <h1 className="modern-typography-medium gradient-text mb-2">Avril Dashboard</h1>
          <p className="text-sm text-muted mb-4">Login with Human.tech (WaaP).</p>
          {address && (
            <p className="text-xs text-muted mb-3 font-mono break-all">
              Connected wallet: <span className="text-soft-white">{address}</span>
            </p>
          )}
          <button onClick={() => void login()} className="btn-primary">
            Login with WaaP
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Topbar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((v) => !v)} />
      <main className="flex-1 pt-16 md:pt-20 p-4 md:p-6 min-h-screen max-w-full">{children}</main>
    </>
  );
}
