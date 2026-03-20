'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

const STATS = [
  { label: 'Active Agents', value: '4', icon: '🤖' },
  { label: 'Open Tasks', value: '12', icon: '📋' },
  { label: 'Messages Today', value: '47', icon: '💬' },
  { label: 'Wallets', value: '3', icon: '🔐' },
];

type LocalMessage = {
  id: string;
  role: 'psychologist' | 'llm';
  content: string;
  createdAt: string;
};

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_APP_TOKEN ?? '';

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function HomePage() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function ensureChatId(): Promise<string | null> {
    if (chatId) return chatId;
    try {
      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-token': DASHBOARD_TOKEN,
        },
        body: JSON.stringify({
          title: 'Psychologist Session',
          area: 'General',
        }),
      });
      if (!res.ok) {
        setStatus('Could not initialize LLM chat session.');
        return null;
      }
      const data = await res.json();
      const createdId = typeof data?.chatId === 'string' ? data.chatId : null;
      setChatId(createdId);
      return createdId;
    } catch {
      setStatus('Network error creating chat session.');
      return null;
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSend) return;

    const content = draft.trim();
    const nowIso = new Date().toISOString();
    setDraft('');
    setStatus('Sending to LLM...');
    setSending(true);

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, role: 'psychologist', content, createdAt: nowIso },
    ]);

    try {
      const resolvedChatId = await ensureChatId();
      if (!resolvedChatId) return;

      const res = await fetch('/api/chat/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-token': DASHBOARD_TOKEN,
        },
        body: JSON.stringify({
          chatId: resolvedChatId,
          message: content,
          model: 'venice',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(`LLM error: ${data?.error?.message || 'request failed'}`);
        return;
      }

      const reply = typeof data?.reply === 'string' ? data.reply : '';
      if (!reply) {
        setStatus('LLM returned an empty response.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-llm`, role: 'llm', content: reply, createdAt: new Date().toISOString() },
      ]);
      setStatus('');
    } catch {
      setStatus('Network error contacting LLM.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="font-sans">
      <h2 className="modern-typography-medium gradient-text mb-6">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className="glass p-5 smooth-transition hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(124,58,237,0.2)]">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-2xl font-bold text-white font-heading">{s.value}</span>
            </div>
            <p className="text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="glass-strong p-6">
        <h3 className="font-semibold font-heading mb-3">Recent Activity</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li>🟢 <b className="text-white">AgentMotus</b> completed task <code>deploy-landing</code></li>
          <li>🔵 <b className="text-white">ResearchAgent</b> started run <code>funding-scan-v2</code></li>
          <li>💬 New message in <b className="text-white">#general</b> from Gerry</li>
          <li>🔐 Wallet <code>0x7a3…f12</code> created by <b className="text-white">Admin</b></li>
        </ul>
      </div>

      <div className="glass mt-8 p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold font-heading">Psychologist Chat</h3>
            <p className="text-xs text-muted">Talk directly with an LLM (Venice), not Agent Office.</p>
          </div>
          <span className="text-[11px] text-muted px-2 py-1 rounded-full border border-border bg-surface">Model: Venice</span>
        </div>

        <div ref={scrollRef} className="h-72 overflow-y-auto rounded-xl border border-border bg-surface/40 p-3 space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted">Start a session by sending your first message.</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  message.role === 'psychologist'
                    ? 'ml-auto bg-white/10 text-foreground'
                    : 'mr-auto bg-accent/10 text-foreground'
                }`}
              >
                <p className="text-[11px] text-muted mb-1">
                  {message.role === 'psychologist' ? 'Psychologist' : 'LLM'} · {timeLabel(message.createdAt)}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the LLM about the case, approach, or notes..."
            className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent smooth-transition"
          />
          <button type="submit" disabled={!canSend} className="btn-primary text-sm disabled:opacity-50">
            {sending ? 'Thinking…' : 'Send'}
          </button>
        </form>
        {status && <p className="mt-2 text-xs text-yellow-300">{status}</p>}
      </div>
    </div>
  );
}
