'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import {
  AGENT_AREAS,
  DEFAULT_AGENT_AREA,
  getSubAreasForArea,
  type AgentArea,
  type AgentSubArea,
} from '@/src/lib/agentAreas';
import Button from '@/src/components/ui/Button';
import Card from '@/src/components/ui/Card';
import SectionTitle from '@/src/components/ui/SectionTitle';

type Chat = {
  _id: string;
  title: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  agent?: { name: string; area?: string; subArea?: string };
};

type Msg = {
  _id: string;
  authorType: 'human' | 'agent';
  authorId: string;
  content: string;
  createdAt: string;
};

type ModelChoice = 'codex' | 'opus' | 'venice';

type ApiErrorPayload = {
  error?: string | { code?: string; message?: string; retryable?: boolean; details?: unknown };
};

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 65000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function extractServerError(payload: ApiErrorPayload | null, fallback = 'Unknown server error') {
  if (!payload?.error) return fallback;
  if (typeof payload.error === 'string') return payload.error;
  return payload.error.message || payload.error.code || fallback;
}

export default function ChatsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState<ModelChoice>('venice');
  const [streamingText, setStreamingText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [newChatArea, setNewChatArea] = useState<AgentArea>(DEFAULT_AGENT_AREA);
  const [newChatSubArea, setNewChatSubArea] = useState<AgentSubArea | ''>('');
  const [launchPrompt, setLaunchPrompt] = useState('');
  const [launchingOffice, setLaunchingOffice] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const subAreaOptions = useMemo(() => getSubAreasForArea(newChatArea), [newChatArea]);

  const createChatPayload = useMemo(
    () => ({
      title: `Chat ${chats.length + 1}`,
      area: newChatArea,
      ...(subAreaOptions.includes(newChatSubArea as AgentSubArea) && newChatSubArea
        ? { subArea: newChatSubArea as AgentSubArea }
        : {}),
    }),
    [chats.length, newChatArea, newChatSubArea, subAreaOptions]
  );

  const loadState = async (chatId?: string | null) => {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    try {
      const res = await fetch(`/api/chat/state${query}`, {
        cache: 'no-store',
        headers: { 'x-dashboard-token': 'a41b701b9fad98ced893c3077442327793579085e93520dd45608b463c2849fc' },
      });
      if (!res.ok) {
        let text = '';
        try {
          const payload = (await res.json()) as ApiErrorPayload;
          text = extractServerError(payload);
        } catch {
          text = await res.text();
        }
        setStatusMessage(`⚠️ No se pudo actualizar el estado (${res.status}): ${text || 'intenta de nuevo'}`);
        return;
      }
      const data = await res.json();
      setChats(data.chats || []);
      setMessages(data.messages || []);
    } catch {
      setStatusMessage('⚠️ Falló la actualización del chat. Revisa tu conexión.');
    }
  };

  useEffect(() => {
    const savedModel = localStorage.getItem('avril-dashboard:model') as ModelChoice | null;
    if (savedModel === 'codex' || savedModel === 'opus' || savedModel === 'venice') setModel(savedModel);
  }, []);

  useEffect(() => {
    const chatIdFromUrl = searchParams.get('chatId')?.trim();
    if (chatIdFromUrl) setSelectedChatId(chatIdFromUrl);
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('avril-dashboard:model', model);
  }, [model]);

  useEffect(() => {
    void loadState(selectedChatId);
    const id = setInterval(() => {
      if (!streamingText) void loadState(selectedChatId);
    }, 2500);
    return () => clearInterval(id);
  }, [selectedChatId, streamingText]);

  useEffect(() => {
    if (!selectedChatId && chats.length > 0) {
      setSelectedChatId(chats[0]._id);
      return;
    }

    if (selectedChatId && chats.length > 0 && !chats.some((c) => c._id === selectedChatId)) {
      setSelectedChatId(chats[0]._id);
      setStatusMessage('ℹ️ El chat seleccionado ya no existe. Se abrió el chat más reciente.');
    }
  }, [chats, selectedChatId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText]);

  const selectedChat = useMemo(
    () => chats.find((c) => c._id === selectedChatId),
    [chats, selectedChatId]
  );

  async function handleCreateChat() {
    const res = await fetch('/api/chat/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dashboard-token': 'a41b701b9fad98ced893c3077442327793579085e93520dd45608b463c2849fc',
      },
      body: JSON.stringify(createChatPayload),
    });
    if (!res.ok) {
      setStatusMessage('❌ No se pudo crear el chat.');
      return;
    }
    const data = await res.json();
    setSelectedChatId(data.chatId);
    await loadState(data.chatId);
  }

  async function animateAssistantReply(text: string) {
    setStreamingText('');
    for (let i = 1; i <= text.length; i++) {
      setStreamingText(text.slice(0, i));
      await sleep(8);
    }
    await sleep(120);
    setStreamingText('');
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;

    let chatId = selectedChatId;
    if (!chatId) {
      const createRes = await fetch('/api/chat/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-token': 'a41b701b9fad98ced893c3077442327793579085e93520dd45608b463c2849fc',
        },
        body: JSON.stringify({
          title: 'New Chat',
          area: newChatArea,
          ...(subAreaOptions.includes(newChatSubArea as AgentSubArea) && newChatSubArea
            ? { subArea: newChatSubArea as AgentSubArea }
            : {}),
        }),
      });
      if (!createRes.ok) {
        setStatusMessage('❌ No se pudo crear un chat para enviar el mensaje.');
        return;
      }
      const created = await createRes.json();
      chatId = created.chatId;
      setSelectedChatId(chatId);
    }

    setSending(true);
    setStatusMessage('⏳ Enviando al agente...');
    const message = draft.trim();
    setDraft('');

    try {
      const res = await fetchWithTimeout(
        '/api/chat/respond',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dashboard-token': 'a41b701b9fad98ced893c3077442327793579085e93520dd45608b463c2849fc',
          },
          body: JSON.stringify({ chatId, message, model }),
        },
        90000
      );

      if (!res.ok) {
        let payload: ApiErrorPayload | null = null;
        try {
          payload = (await res.json()) as ApiErrorPayload;
        } catch {
          payload = null;
        }

        const serverError = extractServerError(payload, 'Intenta de nuevo.');
        const code = typeof payload?.error === 'object' ? payload.error?.code : undefined;

        if (code === 'CHAT_NOT_FOUND') {
          setStatusMessage(`❌ ${serverError} Crea/selecciona otro chat y reintenta.`);
          setSelectedChatId(null);
          await loadState(null);
        } else if (res.status === 502 && (serverError.includes('fetch failed') || serverError.toLowerCase().includes('bridge'))) {
          setStatusMessage(`❌ El agente no está alcanzable (bridge/túnel). Comprueba que OPENCLAW_BRIDGE_URL esté activo y el túnel corriendo.`);
          await loadState(chatId);
        } else {
          setStatusMessage(`❌ Error del servidor (${res.status}): ${serverError}`);
          await loadState(chatId);
        }
        return;
      }

      const data = await res.json();
      const reply = data?.reply || '';

      setStatusMessage('🔄 Actualizando estado del chat...');
      await loadState(chatId);

      if (reply) {
        setStatusMessage('✍️ Renderizando respuesta...');
        await animateAssistantReply(reply);
      }

      await loadState(chatId);
      setStatusMessage('');
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      setStatusMessage(
        isAbort
          ? '⏱️ Timeout esperando al backend (30s). Revisa Convex/bridge y vuelve a intentar.'
          : '❌ Falló la solicitud. Revisa conexión o configuración del bridge.'
      );
    } finally {
      setSending(false);
    }
  }

  async function handleLaunchOffice() {
    if (!selectedChatId || launchingOffice) return;
    const prompt = launchPrompt.trim() || 'Launch agent office for this chat venture.';
    setLaunchingOffice(true);
    setStatusMessage('🚀 Launching Agent Office...');
    try {
      const res = await fetch('/api/orchestration/spawn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dashboard-token': 'a41b701b9fad98ced893c3077442327793579085e93520dd45608b463c2849fc',
        },
        body: JSON.stringify({ chatId: selectedChatId, prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusMessage(`❌ ${data?.error?.message || 'Failed to launch office.'}`);
        return;
      }
      const sessionId = data?.sessionId;
      if (!sessionId) {
        setStatusMessage('❌ Missing sessionId from spawn response.');
        return;
      }
      setStatusMessage('✅ Agent Office launched.');
      router.push(`/agents/office?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? `❌ ${err.message}` : '❌ Failed to launch office.');
    } finally {
      setLaunchingOffice(false);
    }
  }

  return (
    <div className="font-sans space-y-4">
      <SectionTitle title="Chats" subtitle="Threaded conversations with Avril agents and models." />
      <div className="flex gap-4 h-[calc(100vh-10rem)]">
      <Card className="w-72 overflow-y-auto flex-shrink-0 rounded-2xl">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm font-heading">Threads</h3>
            <Button onClick={handleCreateChat} className="text-xs py-1.5 px-3">
              + New
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-muted mb-0.5">Area</label>
              <select
                value={newChatArea}
                onChange={(e) => {
                  const a = e.target.value as AgentArea;
                  setNewChatArea(a);
                  const opts = getSubAreasForArea(a);
                  setNewChatSubArea(opts.length ? '' : '');
                }}
                className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-gray-200"
              >
                {AGENT_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-muted mb-0.5">Sub-area</label>
              <select
                value={newChatSubArea}
                onChange={(e) => setNewChatSubArea(e.target.value as AgentSubArea | '')}
                className="w-full bg-surface border border-border rounded-lg px-2 py-1 text-gray-200"
                disabled={subAreaOptions.length === 0}
              >
                <option value="">—</option>
                {subAreaOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {chats.map((t) => (
          <button
            key={t._id}
            onClick={() => setSelectedChatId(t._id)}
            className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] smooth-transition ${
              selectedChatId === t._id ? 'bg-white/[0.03]' : ''
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-white truncate">{t.title}</span>
            </div>
            {t.agent && (
              <p className="text-[10px] text-muted/80 mb-0.5">
                {t.agent.name}
                {(t.agent.area || t.agent.subArea) &&
                  ` · ${[t.agent.area, t.agent.subArea].filter(Boolean).join(' → ')}`}
              </p>
            )}
            <p className="text-xs text-muted truncate">{t.lastMessage || 'No messages yet'}</p>
            <p className="text-[10px] text-muted/60 mt-0.5">{timeLabel(t.lastMessageAt || t.updatedAt)}</p>
          </button>
        ))}

        {chats.length === 0 && <p className="p-4 text-xs text-muted">No chats yet. Create one.</p>}
      </Card>

      <Card className="flex-1 rounded-2xl flex flex-col">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm font-heading">{selectedChat?.title || 'Select a chat'}</h3>
            {selectedChat?.agent && (
              <p className="text-xs text-muted mt-0.5">
                {selectedChat.agent.name}
                {(selectedChat.agent.area || selectedChat.agent.subArea) &&
                  ` · ${[selectedChat.agent.area, selectedChat.agent.subArea].filter(Boolean).join(' → ')}`}
              </p>
            )}
            {statusMessage && <p className="text-[11px] text-yellow-300 mt-1 truncate">{statusMessage}</p>}
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap justify-end">
            <input
              type="text"
              value={launchPrompt}
              onChange={(e) => setLaunchPrompt(e.target.value)}
              placeholder="Office launch prompt (optional)"
              className="bg-surface border border-border rounded-lg px-2 py-1 text-gray-200 w-64 max-w-full"
            />
            <Button
              onClick={() => void handleLaunchOffice()}
              disabled={!selectedChatId || launchingOffice}
              variant="secondary"
              className="text-xs py-1.5 px-3 disabled:opacity-50"
            >
              {launchingOffice ? 'Launching…' : 'Launch Agent Office'}
            </Button>
            <span className="text-muted">Model:</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelChoice)}
              className="bg-surface border border-border rounded-lg px-2 py-1 text-gray-200"
            >
              <option value="venice">Venice</option>
              <option value="codex">Codex</option>
              <option value="opus">Opus</option>
            </select>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m._id} className={`flex flex-col ${m.authorType === 'agent' ? 'items-start' : 'items-end'}`}>
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm smooth-transition ${
                  m.authorType === 'agent' ? 'bg-accent/10 text-gray-200' : 'bg-white/10 text-gray-200'
                }`}
              >
                <p className="text-xs font-medium text-muted mb-1">
                  {m.authorId} · {timeLabel(m.createdAt)}
                </p>
                {m.authorType === 'agent' ? (
                  <div className="chat-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex flex-col items-start">
              <div className="max-w-[70%] px-4 py-2.5 rounded-xl text-sm bg-accent/10 text-gray-200">
                <p className="text-xs font-medium text-muted mb-1">AvrilAgent · now</p>
                <div className="chat-markdown whitespace-pre-wrap">{streamingText}</div>
              </div>
            </div>
          )}

          {messages.length === 0 && selectedChatId && (
            <p className="text-sm text-muted">No messages yet. Send the first one.</p>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent smooth-transition"
            />
            <Button
              type="submit"
              disabled={sending}
              className="text-sm disabled:opacity-50"
            >
              {sending ? 'Thinking…' : 'Send'}
            </Button>
          </div>
        </form>
      </Card>
      </div>
    </div>
  );
}
