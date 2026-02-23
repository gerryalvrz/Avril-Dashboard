'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Topbar onOpenMenu={() => setMobileOpen(true)} />
      <main className="mt-14 p-4 md:p-6 min-h-[calc(100vh-3.5rem)] md:ml-56">
        {children}
      </main>
    </>
  );
}
