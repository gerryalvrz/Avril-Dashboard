'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type AgentOption = {
  agentKey: string;
  name: string;
  role?: string;
  status: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'agent';
  agentKey: string;
  agentName: string;
  content: string;
  timestamp: number;
};

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_APP_TOKEN ?? '';

export default function OfficeAgentChat({
  agents,
  chatId,
  selectedAgentKey,
  onSelectAgent,
}: {
  agents: AgentOption[];
  chatId: string;
  selectedAgentKey: string | null;
  onSelectAgent: (key: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeAgent = agents.find((a) => a.agentKey === selectedAgentKey) ?? agents[0] ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeAgent?.agentKey]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !activeAgent || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      agentKey: activeAgent.agentKey,
      agentName: activeAgent.name,
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (DASHBOARD_TOKEN) headers['x-dashboard-token'] = DASHBOARD_TOKEN;

      const res = await fetch('/api/chat/respond', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          chatId,
          message: `[Directed to ${activeAgent.name} (${activeAgent.role || 'agent'})]\n\n${text}`,
        }),
      });
      const data = await res.json().catch(() => ({ reply: 'No response.' }));

      const agentMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'agent',
        agentKey: activeAgent.agentKey,
        agentName: activeAgent.name,
        content: data.reply || data.error?.message || 'No response received.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'agent',
          agentKey: activeAgent.agentKey,
          agentName: activeAgent.name,
          content: err instanceof Error ? err.message : 'Request failed.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, activeAgent, sending, chatId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const agentMessages = messages.filter(
    (m) => m.agentKey === activeAgent?.agentKey
  );

  if (!activeAgent) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center justify-center h-[420px]">
        <p className="text-xs text-muted">No agents available to chat with.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-[420px]">
      {/* Agent selector bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setSelectorOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-sm text-white font-medium truncate">{activeAgent.name}</span>
            <span className="text-[11px] text-slate-400 truncate">{activeAgent.role}</span>
            <svg
              className={`ml-auto w-3.5 h-3.5 text-slate-400 transition-transform ${selectorOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {selectorOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-[200px] overflow-y-auto">
              {agents.map((ag) => (
                <button
                  key={ag.agentKey}
                  type="button"
                  onClick={() => {
                    onSelectAgent(ag.agentKey);
                    setSelectorOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/10 transition-colors ${
                    ag.agentKey === activeAgent.agentKey ? 'bg-white/5' : ''
                  }`}
                >
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-white truncate">{ag.name}</span>
                  <span className="text-[10px] text-slate-400 truncate ml-auto">{ag.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-[10px] text-slate-500 flex-shrink-0">
          {agentMessages.length} msg{agentMessages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {agentMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-slate-500 text-center">
              Send a message to <span className="text-white">{activeAgent.name}</span>
            </p>
          </div>
        )}
        {agentMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent/20 text-white'
                  : 'bg-white/5 text-slate-200'
              }`}
            >
              {msg.role === 'agent' && (
                <p className="text-[10px] text-slate-400 mb-1 font-medium">{msg.agentName}</p>
              )}
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-xl px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-1 font-medium">{activeAgent.name}</p>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeAgent.name}...`}
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={sending || !input.trim()}
            className="px-3 py-2 rounded-lg bg-accent/80 hover:bg-accent text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
