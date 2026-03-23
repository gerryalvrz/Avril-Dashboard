'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import OfficeWorld2D from '@/src/components/office/OfficeWorld2D';
import OfficeLegend from '@/src/components/office/OfficeLegend';
import SessionTimeline from '@/src/components/office/SessionTimeline';
import OfficeAgentChat from '@/src/components/office/OfficeAgentChat';
import { div } from 'framer-motion/client';

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_APP_TOKEN ?? '';

type Session = {
  _id: string;
  chatId?: string;
  status: 'queued' | 'spawning' | 'active' | 'failed' | 'completed';
  spawnRequestId?: string;
  vpsRef?: string;
  containerRef?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type Agent = {
  _id: string;
  agentKey: string;
  parentAgentKey?: string;
  name: string;
  role?: string;
  status: 'spawning' | 'idle' | 'working' | 'blocked' | 'completed' | 'error';
  x?: number;
  y?: number;
  meta?: unknown;
};

type EventItem = {
  _id: string;
  type: string;
  payload?: unknown;
  createdAt: string;
};

export default function AgentOfficePage() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedAgentKey, setSelectedAgentKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showChat, setShowChat] = useState(false);

  const sessionId = searchParams.get('sessionId')?.trim() || '';
  const chatIdParam = searchParams.get('chatId')?.trim() || '';
  const resolvedChatId = session?.chatId || chatIdParam;

  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (DASHBOARD_TOKEN) headers['x-dashboard-token'] = DASHBOARD_TOKEN;
    return headers;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;

    async function loadState() {
      try {
        const res = await fetch(`/api/orchestration/session?sessionId=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
          credentials: 'include',
          headers: authHeaders,
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setStatusMessage(data?.error?.message || 'Failed to load office state');
          return;
        }
        setSession(data.session ?? null);
        setAgents(Array.isArray(data.agents) ? data.agents : []);
        setEvents(Array.isArray(data.events) ? data.events : []);
        setStatusMessage('');
      } catch (err) {
        if (!active) return;
        setStatusMessage(err instanceof Error ? err.message : 'Failed to load office state');
      }
    }

    void loadState();
    const id = setInterval(loadState, 1200);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [sessionId]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.agentKey === selectedAgentKey) ?? null,
    [agents, selectedAgentKey]
  );
  const lastEvent = events[events.length - 1] ?? null;
  const wsStatus = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const t = events[i]?.type;
      if (t === 'gateway.connected') return 'connected';
      if (t === 'gateway.connecting') return 'connecting';
      if (t === 'gateway.disconnected') return 'disconnected';
    }
    return 'connecting';
  }, [events]);

  async function sendAgentCommand(command: 'pause' | 'kill') {
    if (!sessionId || !selectedAgent) return;
    const res = await fetch('/api/orchestration/control', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ sessionId, agentKey: selectedAgent.agentKey, command }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatusMessage(data?.error?.message || `Failed to ${command} agent`);
      return;
    }
    setStatusMessage(`${command} command sent to ${selectedAgent.name}`);
  }

  return (
    <div className="font-sans space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="modern-typography-medium gradient-text">Agent Office</h2>
          <p className="text-xs text-muted mt-1">Session: {sessionId || '—'}</p>
        </div>
        {session && (
          <div></div>
        )}
      </div>

      <OfficeLegend />
      {statusMessage && <p className="text-xs text-yellow-300">{statusMessage}</p>}
      <div className="glass rounded-2xl p-3">
        <h4 className="text-sm font-semibold font-heading mb-2">Debug Panel (Temporary)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div className="border border-white/10 rounded-lg p-2 bg-black/20">
            <p className="text-muted">WebSocket Status</p>
            <p className="text-white mt-0.5">{wsStatus}</p>
          </div>
          <div className="border border-white/10 rounded-lg p-2 bg-black/20">
            <p className="text-muted">Last Event</p>
            <p className="text-white mt-0.5">{lastEvent ? lastEvent.type : '—'}</p>
            <p className="text-muted/80">{lastEvent ? new Date(lastEvent.createdAt).toLocaleTimeString() : '—'}</p>
          </div>
          <div className="border border-white/10 rounded-lg p-2 bg-black/20">
            <p className="text-muted">Raw Agent Count (Convex)</p>
            <p className="text-white mt-0.5">{agents.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4">
        <OfficeWorld2D agents={agents} selectedAgentKey={selectedAgentKey} onSelectAgent={setSelectedAgentKey} />

        <div className="space-y-4">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading text-sm">Agent Controls</h4>
              {resolvedChatId && (
                <button
                  type="button"
                  onClick={() => setShowChat((v) => !v)}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${showChat
                      ? 'bg-accent/20 text-accent ring-1 ring-accent/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {showChat ? 'Hide Chat' : 'Chat'}
                </button>
              )}
            </div>
            {!selectedAgent && <p className="text-xs text-muted">Select an agent in the map to inspect and control it.</p>}
            {selectedAgent && (
              <div className="space-y-2">
                <p className="text-sm text-white">{selectedAgent.name}</p>
                <p className="text-xs text-muted">Role: {selectedAgent.role || '—'}</p>
                <p className="text-xs text-muted">Status: {selectedAgent.status}</p>
                <div className="flex gap-2 pt-1">
                  <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => void sendAgentCommand('pause')}>
                    Pause
                  </button>
                  <button className="btn-primary text-xs py-1.5 px-3" onClick={() => void sendAgentCommand('kill')}>
                    Kill
                  </button>
                </div>
              </div>
            )}
          </div>

          {showChat && resolvedChatId && (
            <OfficeAgentChat
              agents={agents.map((a) => ({
                agentKey: a.agentKey,
                name: a.name,
                role: a.role,
                status: a.status,
              }))}
              chatId={resolvedChatId}
              selectedAgentKey={selectedAgentKey}
              onSelectAgent={setSelectedAgentKey}
            />
          )}

          <SessionTimeline events={events} />
        </div>
      </div>
    </div>
  );
}
