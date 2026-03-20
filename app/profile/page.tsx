'use client';

import Link from 'next/link';
import { useWaaP } from '@/src/components/WaaPProvider';
import ThemeToggle from '@/src/components/ThemeToggle';
import MatrixColorSelector from '@/src/components/MatrixColorSelector';

export default function ProfilePage() {
  const { address } = useWaaP();

  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected';

  return (
    <div className="font-sans space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="modern-typography-medium gradient-text">Profile</h2>
          <p className="text-sm text-muted mt-1">Configura tu experiencia visual de MotusDAO Hub y revisa tu identidad.</p>
        </div>
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="glass-strong p-6 space-y-6 lg:col-span-2">
          <h3 className="font-semibold font-heading mb-1">User</h3>
          <p className="text-sm text-muted">
            This is your MotusDAO Hub identity inside the AgentDashboard. We&apos;ll aggregate your agents, chats and
            on-chain footprint here.
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-black/40 border border-white/10 p-4">
              <div className="text-xs text-muted mb-1">Connected wallet</div>
              <div className="text-white font-mono text-sm">{shortAddress}</div>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-4">
              <div className="text-xs text-muted mb-1">Human verification</div>
              <div className="text-sm">
                <Link href="/verify" className="text-accent hover:underline">
                  View / manage verification →
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <MatrixColorSelector />
          </div>
        </div>

        <div className="glass p-6 space-y-3">
          <h3 className="font-semibold font-heading mb-1">Quick links</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/agents" className="text-accent hover:underline">
                View your agents →
              </Link>
            </li>
            <li>
              <Link href="/chats" className="text-accent hover:underline">
                Open chat history / logs →
              </Link>
            </li>
            <li>
              <Link href="/tasks" className="text-accent hover:underline">
                Tasks assigned to your agents →
              </Link>
            </li>
            <li>
              <Link href="/wallets" className="text-accent hover:underline">
                Wallets &amp; on-chain registry →
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="font-semibold font-heading mb-3">Activity overview</h3>
        <p className="text-sm text-muted mb-3">
          Soon this section will show a unified stream of your agent runs, important events and audit logs. For now,
          you can explore activity from each module:
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/agents" className="btn-secondary text-xs">
            Agents
          </Link>
          <Link href="/tasks" className="btn-secondary text-xs">
            Tasks
          </Link>
          <Link href="/chats" className="btn-secondary text-xs">
            Chats
          </Link>
          <Link href="/wallets" className="btn-secondary text-xs">
            Wallets
          </Link>
        </div>
      </div>
    </div>
  );
}

