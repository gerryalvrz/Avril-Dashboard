'use client';

import { useState, useEffect } from 'react';
import { useWaaP } from '@/src/components/WaaPProvider';

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
  const { address } = useWaaP();
  const [humanVerified, setHumanVerified] = useState<boolean | null>(null);
  const [loadingHuman, setLoadingHuman] = useState(false);

  useEffect(() => {
    if (!address) {
      setHumanVerified(null);
      return;
    }
    let cancelled = false;
    setLoadingHuman(true);
    const query = new URLSearchParams({ address });
    fetch(`/api/human/check?${query.toString()}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { ok: false }))
      .then((data) => {
        if (!cancelled && data?.ok === true) setHumanVerified(data.verified === true);
        else if (!cancelled) setHumanVerified(false);
      })
      .catch(() => {
        if (!cancelled) setHumanVerified(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingHuman(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

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

        <div className="space-y-4">
          <div className="glass-strong p-6">
            <h3 className="font-semibold font-heading mb-2">Human verification (Passport)</h3>
            <p className="text-xs text-muted mb-3">
              Verify your wallet with Human Passport to prove humanity. Required for some dashboard features.
            </p>
            {!address ? (
              <p className="text-xs text-muted">Connect a wallet to see verification status.</p>
            ) : loadingHuman ? (
              <p className="text-xs text-muted">Checking…</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      humanVerified === true
                        ? 'bg-green-500/10 text-green-400'
                        : humanVerified === false
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-white/10 text-muted'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        humanVerified === true ? 'bg-green-400' : humanVerified === false ? 'bg-amber-400' : 'bg-muted'
                      }`}
                    />
                    {humanVerified === true ? 'Verified' : humanVerified === false ? 'Not verified' : 'Unknown'}
                  </span>
                </div>
                <a
                  href="/verify"
                  className="inline-block text-sm text-accent hover:underline"
                >
                  {humanVerified === true ? 'View verification page' : 'Complete verification →'}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

