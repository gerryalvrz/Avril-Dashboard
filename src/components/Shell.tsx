'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useWaaP } from './WaaPProvider';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isReady, isAuthenticated, login, address } = useWaaP();

  if (!isReady) {
    return <main className="min-h-screen grid place-items-center text-sm text-muted font-sans">Initializing WaaP…</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md glass p-8 text-center">
          <h1 className="modern-typography-medium gradient-text mb-2">AgentDashboard</h1>
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
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Topbar onOpenMenu={() => setMobileOpen(true)} />
      <main className="flex-1 pt-16 md:pt-20 md:ml-64 p-4 md:p-6 min-h-screen max-w-full">{children}</main>
    </>
  );
}
