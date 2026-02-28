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
    if (address) {
      return (
        <main className="min-h-screen grid place-items-center p-6">
          <div className="w-full max-w-5xl glass-strong p-8 text-left space-y-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/20 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-blue animate-pulse" />
                  <span className="text-[11px] uppercase tracking-wide text-muted">
                    Read-only preview
                  </span>
                </div>
                <h1 className="modern-typography-medium gradient-text mb-1">Visitor dashboard</h1>
                <p className="text-sm text-muted">
                  This wallet is <span className="font-semibold text-soft-white">not</span> the configured owner for this
                  deployment, so you are seeing a safe, non-interactive preview.
                </p>
                <p className="text-sm text-muted">
                  To explore the full experience with <span className="font-semibold">your own Convex + OpenClaw</span>,
                  run AgentDashboard locally by following the steps below.
                </p>
              </div>
              <div className="text-[11px] text-muted bg-black/40 border border-white/20 rounded-2xl px-3 py-2 font-mono break-all max-w-xs">
                <div className="text-[10px] uppercase tracking-wide text-muted mb-0.5">
                  Visitor wallet
                </div>
                <span className="text-soft-white">{address}</span>
              </div>
            </div>

            <div className="font-sans">
              <h2 className="modern-typography-medium text-base text-soft-white mb-4">
                How to run your own AgentDashboard
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 glass p-4 smooth-transition hover:shadow-glow hover:scale-[1.01]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/40 text-xs font-semibold text-soft-white">
                      1
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-soft-white">Clone this repository</p>
                      <p className="text-xs text-muted">
                        Use{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">git clone …</code>{' '}
                        and <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">cd</code> into the folder.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 glass p-4 smooth-transition hover:shadow-glow hover:scale-[1.01]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/40 text-xs font-semibold text-soft-white">
                      2
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-soft-white">Install dependencies</p>
                      <p className="text-xs text-muted">
                        Run{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                          npm install
                        </code>{' '}
                        from the project root.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 glass p-4 smooth-transition hover:shadow-glow hover:scale-[1.01]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/40 text-xs font-semibold text-soft-white">
                      3
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-soft-white">Configure environment variables</p>
                      <p className="text-xs text-muted">
                        Copy{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">.env.example</code>{' '}
                        to{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">.env.local</code> and
                        fill at least:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-soft-white/90">
                        <code className="font-mono bg-black/40 px-1 py-0.5 rounded break-all">
                          NEXT_PUBLIC_CONVEX_URL
                        </code>
                        <code className="font-mono bg-black/40 px-1 py-0.5 rounded break-all">
                          CONVEX_DEPLOYMENT
                        </code>
                        <code className="font-mono bg-black/40 px-1 py-0.5 rounded break-all">
                          CONVEX_SERVER_SECRET
                        </code>
                        <code className="font-mono bg-black/40 px-1 py-0.5 rounded break-all">
                          DASHBOARD_SESSION_SECRET
                        </code>
                        <code className="font-mono bg-black/40 px-1 py-0.5 rounded break-all">
                          OPENCLAW_BRIDGE_URL
                        </code>
                        <code className="font-mono bg-black/40 px-1 py-0.5 rounded break-all">
                          OPENCLAW_BRIDGE_TOKEN
                        </code>
                        <code className="font-mono bg-black/40 px-1 py-0.5 rounded break-all">
                          NEXT_PUBLIC_OWNER_WALLET
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 glass p-4 smooth-transition hover:shadow-glow hover:scale-[1.01]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/40 text-xs font-semibold text-soft-white">
                      4
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-soft-white">Set up the OpenClaw bridge</p>
                      <p className="text-xs text-muted">
                        Follow{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                          docs/OPENCLAW_BRIDGE.md
                        </code>{' '}
                        to run the bridge locally and expose it via Cloudflare tunnel.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 glass p-4 smooth-transition hover:shadow-glow hover:scale-[1.01]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/40 text-xs font-semibold text-soft-white">
                      5
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-soft-white">Run the dashboard</p>
                      <p className="text-xs text-muted">
                        Start the app with{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                          npm run dev
                        </code>{' '}
                        and open{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                          http://localhost:3000
                        </code>{' '}
                        using the wallet configured in{' '}
                        <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-[11px]">
                          NEXT_PUBLIC_OWNER_WALLET
                        </code>
                        .
                      </p>
                    </div>
                  </div>
                  <div className="glass p-4 border border-primary-blue/40">
                    <p className="text-xs font-semibold text-soft-white uppercase tracking-wide mb-1">
                      Tip for reviewers
                    </p>
                    <p className="text-xs text-muted">
                      Once running locally, the Home, Chats and Agents sections will be fully wired to your Convex
                      deployment and your OpenClaw bridge — this hosted preview is intentionally read-only.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="w-full max-w-md glass p-8 text-center">
          <h1 className="modern-typography-medium gradient-text mb-2">AgentDashboard</h1>
          <p className="text-sm text-muted mb-4">Login with Human.tech (WaaP) using your owner wallet.</p>
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
