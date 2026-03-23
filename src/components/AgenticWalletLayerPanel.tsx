'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWaaP } from '@/src/components/WaaPProvider';
import { getAgentIdentityOnCelo } from '@/src/lib/celo8004';
import Card from '@/src/components/ui/Card';
import Badge from '@/src/components/ui/Badge';

type ArtifactMatrixRow = {
  role: string;
  delegateEoa: string;
  contextWallet: string;
  ens: string | null;
  erc8004: string;
  txHashes?: Record<string, string | null>;
};

type ArtifactRole = {
  role: string;
  txs?: Array<{ label: string; ok: boolean; txHash?: string | null; errorType?: string }>;
  revokeInstructions?: string;
};

type ArtifactPayload = {
  startup?: string;
  generatedAt?: string;
  rootWallet?: string;
  roleMatrix?: ArtifactMatrixRow[];
  roles?: ArtifactRole[];
};

type ArtifactResponse = {
  ok: boolean;
  artifact?: ArtifactPayload;
  error?: string;
};

type Props = {
  compact?: boolean;
};

function short(addr: string | null | undefined) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgenticWalletLayerPanel({ compact = false }: Props) {
  const { address } = useWaaP();
  const [artifact, setArtifact] = useState<ArtifactPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectedIdentity, setConnectedIdentity] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadArtifact() {
      try {
        const res = await fetch('/api/startup-agent-generator/latest', { cache: 'no-store' });
        const data = (await res.json().catch(() => ({}))) as ArtifactResponse;
        if (!res.ok || !data.ok || !data.artifact) {
          if (!cancelled) setError(data.error || 'No startup artifact found.');
          return;
        }
        if (!cancelled) {
          setArtifact(data.artifact);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load wallet layer data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadArtifact();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setConnectedIdentity(null);
      return;
    }
    getAgentIdentityOnCelo(address)
      .then((data) => {
        if (!cancelled) setConnectedIdentity(data.agentId);
      })
      .catch(() => {
        if (!cancelled) setConnectedIdentity(null);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const stats = useMemo(() => {
    const rows = artifact?.roleMatrix ?? [];
    const hasEns = rows.filter((r) => Boolean(r.ens)).length;
    const has8004 = rows.filter((r) => r.erc8004 === 'registered').length;
    const roleTx = artifact?.roles ?? [];
    const executeOk = roleTx.some((role) => role.txs?.some((t) => t.label.endsWith(':context:execute') && t.ok));
    const revokeOk = roleTx.some((role) => role.txs?.some((t) => t.label.endsWith(':context:revoke') && t.ok));
    return { total: rows.length, hasEns, has8004, executeOk, revokeOk };
  }, [artifact]);

  return (
    <Card className="p-4 rounded-2xl space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-semibold font-heading text-sm">Agentic Wallet Communication Layer</h3>
        <div className="flex gap-2 text-xs">
          <Badge className="bg-blue-500/10 text-blue-300">Roles: {stats.total}</Badge>
          <Badge className="bg-violet-500/10 text-violet-300">ENS: {stats.hasEns}</Badge>
          <Badge className="bg-emerald-500/10 text-emerald-300">8004: {stats.has8004}</Badge>
        </div>
      </div>

      <p className="text-xs text-muted">
        Root <span className="font-mono text-white/80">{short(artifact?.rootWallet)}</span> governs delegate EOAs and Prism contexts.
        Connected wallet 8004: {connectedIdentity != null ? `#${connectedIdentity}` : 'not registered/unknown'}.
      </p>

      {loading ? (
        <p className="text-xs text-muted">Loading wallet communication graph...</p>
      ) : error ? (
        <div className="text-xs text-yellow-300 space-y-2">
          <p>{error}</p>
          <Link href="/startup-agent-generator" className="text-accent hover:underline">
            Generate startup swarm →
          </Link>
        </div>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap text-xs">
            <Badge className={stats.executeOk ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}>
              Execute: {stats.executeOk ? 'ok' : 'missing'}
            </Badge>
            <Badge className={stats.revokeOk ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}>
              Revoke: {stats.revokeOk ? 'ok' : 'missing'}
            </Badge>
            <Badge className="bg-white/10 text-white/80">Startup: {artifact?.startup || 'unknown'}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-white/10">
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Delegate</th>
                  <th className="py-2 pr-3">Context</th>
                  <th className="py-2 pr-3">ENS</th>
                  <th className="py-2 pr-3">8004</th>
                </tr>
              </thead>
              <tbody>
                {(artifact?.roleMatrix ?? []).slice(0, compact ? 3 : 10).map((row) => (
                  <tr key={`${row.role}-${row.delegateEoa}`} className="border-b border-white/5">
                    <td className="py-2 pr-3 text-white">{row.role}</td>
                    <td className="py-2 pr-3 font-mono">{short(row.delegateEoa)}</td>
                    <td className="py-2 pr-3 font-mono">{short(row.contextWallet)}</td>
                    <td className="py-2 pr-3">{row.ens || '—'}</td>
                    <td className="py-2 pr-3">{row.erc8004}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted">
              Visualization: Root → Delegate EOA → Prism Context → ENS + optional ERC-8004 identity.
            </p>
            <Link href="/startup-agent-generator" className="text-xs text-accent hover:underline">
              Open generator →
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
