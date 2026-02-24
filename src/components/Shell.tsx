'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useWaaP } from './WaaPProvider';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isReady, isAuthenticated, login, address } = useWaaP();

  if (!isReady) {
    return <main className="min-h-screen grid place-items-center text-sm text-muted">Initializing WaaP…</main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md bg-panel border border-border rounded-xl p-6 text-center">
          <h1 className="text-xl font-bold text-white mb-2">AgentDashboard</h1>
          <p className="text-sm text-muted mb-4">Login with Human.tech (WaaP) using your owner wallet.</p>
          {address && <p className="text-xs text-yellow-300 mb-3">Connected wallet not allowed: {address}</p>}
          <button
            onClick={() => void login()}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium"
          >
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
      <main className="mt-14 p-4 md:p-6 min-h-[calc(100vh-3.5rem)] md:ml-56">{children}</main>
    </>
  );
}
