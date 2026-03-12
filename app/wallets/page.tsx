'use client';

import { useState } from 'react';
import { useWaaP } from '@/src/components/WaaPProvider';
import { registerAgentIdentityOnCelo } from '@/src/lib/celo8004';

const WALLETS = [
  { address: '0x7a3…f12', label: 'Treasury', provider: 'Human.tech', balance: '2.4 CELO', permissions: 'Owner + Admin' },
  { address: '0x1b9…a03', label: 'Operations', provider: 'AA Service', balance: '0.8 CELO', permissions: 'Admin + Operator' },
  { address: '0x4e2…d77', label: 'Agent Wallet', provider: 'AA Service', balance: '0.1 CELO', permissions: 'Operator (execute)' },
];

const ACTIVITY = [
  { action: 'Wallet created', wallet: 'Agent Wallet', by: 'Admin', time: '1h ago' },
  { action: 'Permission granted', wallet: 'Operations', by: 'Owner', time: '3h ago' },
  { action: 'Transfer approved', wallet: 'Treasury', by: 'Owner + Admin', time: '1d ago' },
];

export default function WalletsPage() {
  const { address, isAuthenticated, login } = useWaaP();
  const [status, setStatus] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const agentUri = process.env.NEXT_PUBLIC_AGENT_REGISTRATION_URI || '';

  async function handleRegister() {
    setStatus(null);

    if (!isAuthenticated) {
      await login();
    }

    if (!agentUri) {
      setStatus('Agent registration URI is not configured. Set NEXT_PUBLIC_AGENT_REGISTRATION_URI in .env.local.');
      return;
    }

    try {
      setIsRegistering(true);
      setStatus('Preparing ERC-8004 registration on Celo…');
      const txHash = await registerAgentIdentityOnCelo(agentUri);
      setStatus(`Submitted registration transaction on Celo. Tx hash: ${txHash.slice(0, 10)}…`);
    } catch (err: any) {
      setStatus(err?.message || 'Failed to register agent identity on Celo.');
    } finally {
      setIsRegistering(false);
    }
  }

  return (
    <div className="font-sans space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="modern-typography-medium gradient-text">Wallets</h2>
        <button className="btn-primary text-sm">+ Create Wallet</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {WALLETS.map((w) => (
          <div
            key={w.address}
            className="glass p-5 smooth-transition hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.2)]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white font-heading">{w.label}</span>
              <span className="text-xs text-muted font-mono">{w.address}</span>
            </div>
            <p className="text-2xl font-bold text-white font-heading mb-1">{w.balance}</p>
            <p className="text-xs text-muted mb-2">Provider: {w.provider}</p>
            <p className="text-xs text-muted">Permissions: {w.permissions}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="glass-strong p-6 lg:col-span-2">
          <h3 className="font-semibold font-heading mb-3">Recent Wallet Activity</h3>
          <ul className="space-y-2 text-sm text-muted">
            {ACTIVITY.map((a, i) => (
              <li key={i}>
                <b className="text-white">{a.action}</b> on <code>{a.wallet}</code> by {a.by} — {a.time}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass-strong p-6">
          <h3 className="font-semibold font-heading mb-2">Celo agent identity (ERC-8004)</h3>
          <p className="text-xs text-muted mb-3">
            Register this dashboard&apos;s agent identity on Celo using the global ERC-8004 identity registry. This
            uses your connected WaaP wallet on Celo.
          </p>

          <div className="mb-3 text-xs text-muted">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white/80">Connected address</span>
              <span className="font-mono">
                {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleRegister}
            disabled={isRegistering}
          >
            {isRegistering ? 'Registering on Celo…' : 'Register ERC-8004 identity on Celo'}
          </button>

          {agentUri && (
            <p className="mt-3 text-[11px] text-muted break-all">
              Using registration URI: <span className="text-white/80">{agentUri}</span>
            </p>
          )}

          {status && <p className="mt-3 text-xs text-muted">{status}</p>}
        </div>
      </div>
    </div>
  );
}

