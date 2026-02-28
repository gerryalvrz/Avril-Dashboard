'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Agent = {
  _id: string;
  name: string;
  status: 'active' | 'paused';
  area?: string;
  subArea?: string;
  chatId?: string;
  lastActivity: string | null;
};

function formatLastActivity(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '—';
  }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/agents', { cache: 'no-store' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data?.error?.message ?? `Failed to load (${res.status})`);
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data.agents)) setAgents(data.agents);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load agents');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="font-sans">
      <div className="flex items-center justify-between mb-6">
        <h2 className="modern-typography-medium gradient-text">Workers (Office)</h2>
        <Link href="/chats" className="btn-primary text-sm">
          New chat (creates worker)
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-yellow-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading workers…</p>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-muted text-left">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Area</th>
                <th className="px-5 py-3 font-medium">Sub-area</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last activity</th>
                <th className="px-5 py-3 font-medium">Chat</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a._id} className="border-b border-white/5 hover:bg-white/[0.02] smooth-transition">
                  <td className="px-5 py-3 text-white font-medium">{a.name}</td>
                  <td className="px-5 py-3 text-muted">{a.area ?? '—'}</td>
                  <td className="px-5 py-3 text-muted">{a.subArea ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'}`}
                      />
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-muted">{formatLastActivity(a.lastActivity)}</td>
                  <td className="px-5 py-3">
                    {a.chatId ? (
                      <Link
                        href={`/chats?chatId=${encodeURIComponent(a.chatId)}`}
                        className="text-accent hover:underline text-xs font-medium"
                      >
                        Open chat
                      </Link>
                    ) : (
                      <span className="text-muted/60 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agents.length === 0 && !loading && (
            <p className="p-6 text-sm text-muted text-center">
              No workers yet. Create a chat to add a worker (each chat is backed by one sub-agent).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
