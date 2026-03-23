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
import AgenticWalletLayerPanel from '@/src/components/AgenticWalletLayerPanel';
import { FounderChatStepper } from '@/components/founder/FounderChatStepper';

const DASHBOARD_TOKEN = process.env.NEXT_PUBLIC_DASHBOARD_APP_TOKEN ?? '';

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

type IgnitionDraftRow = {
  _id: string;
  organizationId: string;
  chatId: string;
  phase?: string;
  status: 'collecting' | 'ready' | 'spawned';
  captured?: Record<string, unknown>;
  ignitionPrompt?: string;
  spawnSessionId?: string;
  updatedAt: string;
};

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
  const [ignitionDraft, setIgnitionDraft] = useState<IgnitionDraftRow | null>(null);
  const [lastArchitectPayload, setLastArchitectPayload] = useState<Record<string, unknown> | null>(null);
  const [existingOfficeSessionId, setExistingOfficeSessionId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const authHeaders = useMemo<Record<string, string>>(() => {
    const headers: Record<string, string> = {};
    if (DASHBOARD_TOKEN) headers['x-dashboard-token'] = DASHBOARD_TOKEN;
    return headers;
  }, []);

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

  const loadIgnitionDraft = async (chatId: string | null) => {
    if (!chatId) {
      setIgnitionDraft(null);
      return;
    }
    try {
      const res = await fetch(`/api/chat/ignition-draft?chatId=${encodeURIComponent(chatId)}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: { ...authHeaders },
      });
      if (!res.ok) {
        setIgnitionDraft(null);
        return;
      }
      const data = await res.json();
      setIgnitionDraft((data?.draft as IgnitionDraftRow) ?? null);
    } catch {
      setIgnitionDraft(null);
    }
  };

  const loadState = async (chatId?: string | null) => {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    try {
      const res = await fetch(`/api/chat/state${query}`, {
        cache: 'no-store',
        credentials: 'include',
        headers: { ...authHeaders },
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
      if (chatId) void loadIgnitionDraft(chatId);
      else setIgnitionDraft(null);
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

  const mergedCaptured = useMemo(() => {
    const a = lastArchitectPayload?.captured;
    const b = ignitionDraft?.captured;
    const ao = a && typeof a === 'object' && !Array.isArray(a) ? (a as Record<string, unknown>) : null;
    const bo = b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, unknown>) : null;
    if (ao && bo) return { ...bo, ...ao };
    return ao ?? bo ?? null;
  }, [lastArchitectPayload, ignitionDraft]);

  const mergedPhase = useMemo(() => {
    const p = lastArchitectPayload?.phase ?? ignitionDraft?.phase;
    return typeof p === 'string' ? p : null;
  }, [lastArchitectPayload, ignitionDraft]);

  const mergedQuestionIndex = useMemo(() => {
    const r = lastArchitectPayload?.questionIndex;
    return typeof r === 'number' && r >= 0 && r <= 3 ? r : null;
  }, [lastArchitectPayload]);

  useEffect(() => {
    setLastArchitectPayload(null);
    setExistingOfficeSessionId(null);
  }, [selectedChatId]);

  async function handleCreateChat() {
    const res = await fetch('/api/chat/create', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
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
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
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
      const ap = data?.architectPayload;
      if (ap && typeof ap === 'object' && !Array.isArray(ap)) {
        setLastArchitectPayload(ap as Record<string, unknown>);
      }
      setStatusMessage(
        data?.ignitionReady
          ? '✅ Ignition ready — use “Send to OpenClaw” below to spawn.'
          : '🔄 Actualizando estado del chat...'
      );
      await loadState(chatId);

      if (reply) {
        setStatusMessage('✍️ Renderizando respuesta...');
        await animateAssistantReply(reply);
      }

      await loadState(chatId);
      await loadIgnitionDraft(chatId);
      setStatusMessage(
        data?.ignitionReady ? '✅ Ignition ready — use “Send to OpenClaw” below to spawn.' : ''
      );
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

  async function spawnOfficeWithPrompt(promptRaw: string) {
    if (!selectedChatId || launchingOffice) return;
    const prompt = promptRaw.trim() || 'Launch agent office for this chat venture.';
    setLaunchingOffice(true);
    setStatusMessage('🚀 Launching Agent Office...');
    try {
      const res = await fetch('/api/orchestration/spawn', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
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
      void loadIgnitionDraft(selectedChatId);
      router.push(`/agents/office?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? `❌ ${err.message}` : '❌ Failed to launch office.');
    } finally {
      setLaunchingOffice(false);
    }
  }

  async function handleLaunchOffice() {
    await spawnOfficeWithPrompt(launchPrompt);
  }

  async function handleSpawnWithSavedPrompt() {
    const fromDb = ignitionDraft?.ignitionPrompt?.trim() ?? '';
    await spawnOfficeWithPrompt(fromDb || launchPrompt);
  }

  async function handleHandoffToOpenClaw() {
    if (!selectedChatId || launchingOffice) return;
    setLaunchingOffice(true);
    setExistingOfficeSessionId(null);
    setStatusMessage('🚀 Sending Venice ignition to OpenClaw…');
    try {
      const res = await fetch('/api/orchestration/handoff-openclaw', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ chatId: selectedChatId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        const sid = data?.existingSessionId;
        if (sid) setExistingOfficeSessionId(String(sid));
        setStatusMessage(
          typeof data?.error?.message === 'string'
            ? `ℹ️ ${data.error.message}`
            : 'ℹ️ This chat was already handed off to OpenClaw.'
        );
        return;
      }
      if (!res.ok) {
        setStatusMessage(`❌ ${data?.error?.message || data?.error?.code || 'Handoff failed.'}`);
        return;
      }
      const sessionId = data?.sessionId;
      if (!sessionId) {
        setStatusMessage('❌ Missing sessionId from handoff response.');
        return;
      }
      setStatusMessage('✅ OpenClaw accepted — opening Agent Office.');
      void loadIgnitionDraft(selectedChatId);
      router.push(`/agents/office?sessionId=${encodeURIComponent(sessionId)}`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? `❌ ${err.message}` : '❌ Handoff failed.');
    } finally {
      setLaunchingOffice(false);
    }
  }

  return (
    <div className="font-sans space-y-4 min-h-[calc(100vh-6rem)] relative overflow-hidden lab-bg">
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[128px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[128px] animate-pulse delay-700" />
      </div>
      <div className="relative z-10 space-y-4">
        <SectionTitle title="Chats" subtitle="Threaded conversations with Avril agents and models." />
        <AgenticWalletLayerPanel compact />
      </div>
      <div className="relative z-10 flex gap-4 h-[calc(100vh-11rem)]">
      <Card className="w-80 overflow-y-auto flex-shrink-0 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-2xl">
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm font-heading text-white/90">Threads</h3>
            <Button onClick={handleCreateChat} className="text-xs py-1.5 px-3 rounded-xl">
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
                className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-gray-200"
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
                className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-gray-200"
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
            className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/[0.04] smooth-transition ${
              selectedChatId === t._id ? 'bg-violet-500/10 border-l-2 border-l-violet-300' : ''
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

      <Card className="flex-1 rounded-2xl flex flex-col border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/10 rounded-t-2xl">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm font-heading text-white/90">{selectedChat?.title || 'Select a chat'}</h3>
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
              className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-gray-200 w-64 max-w-full"
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
              className="bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-gray-200"
            >
              <option value="venice">Venice</option>
              <option value="codex">Codex</option>
              <option value="opus">Opus</option>
            </select>
          </div>
        </div>

        {selectedChatId && (
          <div className="px-4 py-2 border-b border-white/10 bg-black/20 space-y-2">
            <FounderChatStepper
              phase={mergedPhase}
              questionIndex={mergedQuestionIndex}
              captured={mergedCaptured}
              draftStatus={ignitionDraft?.status ?? null}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="text-[10px] py-1 px-2"
                onClick={() => router.push(`/?applyChatDraft=${encodeURIComponent(selectedChatId)}`)}
              >
                Fill Home · Advanced form from this chat
              </Button>
            </div>
          </div>
        )}

        {selectedChatId && (
          <div className="px-4 py-3 border-b border-white/10 bg-black/25 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-white/90">Ignition draft (Convex)</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  ignitionDraft?.status === 'ready'
                    ? 'bg-emerald-500/20 text-emerald-200'
                    : ignitionDraft?.status === 'spawned'
                      ? 'bg-blue-500/20 text-blue-200'
                      : ignitionDraft
                        ? 'bg-amber-500/15 text-amber-100'
                        : 'bg-white/10 text-muted'
                }`}
              >
                {ignitionDraft?.status ?? 'no row'}
              </span>
            </div>
            {ignitionDraft ? (
              <>
                <p className="text-muted">
                  Phase: {ignitionDraft.phase ?? '—'} · Updated {timeLabel(ignitionDraft.updatedAt)}
                  {ignitionDraft.spawnSessionId ? ' · Linked to spawn session' : ''}
                </p>
                <div className="max-h-24 overflow-y-auto rounded-lg bg-black/35 border border-white/10 p-2 text-[10px] text-gray-300 font-mono whitespace-pre-wrap">
                  {ignitionDraft.ignitionPrompt?.trim()
                    ? ignitionDraft.ignitionPrompt.length > 600
                      ? `${ignitionDraft.ignitionPrompt.slice(0, 600)}…`
                      : ignitionDraft.ignitionPrompt
                    : 'No ignition prompt yet — continue the Avril interview until handoff_ready.'}
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  {ignitionDraft.status === 'ready' && (
                    <Button
                      type="button"
                      className="text-xs py-1.5 px-3 font-semibold bg-emerald-600/90 hover:bg-emerald-500/90 border-emerald-400/30"
                      disabled={launchingOffice}
                      onClick={() => void handleHandoffToOpenClaw()}
                    >
                      {launchingOffice ? 'Sending…' : 'Send to OpenClaw (production)'}
                    </Button>
                  )}
                  {ignitionDraft.status === 'spawned' && ignitionDraft.spawnSessionId && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs py-1.5 px-3"
                      onClick={() =>
                        router.push(
                          `/agents/office?sessionId=${encodeURIComponent(ignitionDraft.spawnSessionId!)}`
                        )
                      }
                    >
                      Open Agent Office
                    </Button>
                  )}
                  {existingOfficeSessionId && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="text-xs py-1 px-2"
                      onClick={() =>
                        router.push(
                          `/agents/office?sessionId=${encodeURIComponent(existingOfficeSessionId)}`
                        )
                      }
                    >
                      Open existing office
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs py-1 px-2"
                    disabled={!ignitionDraft.ignitionPrompt?.trim()}
                    onClick={() => setLaunchPrompt(ignitionDraft.ignitionPrompt ?? '')}
                  >
                    Load DB prompt into spawn field
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs py-1 px-2"
                    disabled={launchingOffice || (!ignitionDraft.ignitionPrompt?.trim() && !launchPrompt.trim())}
                    onClick={() => void handleSpawnWithSavedPrompt()}
                  >
                    Spawn with saved prompt
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs py-1 px-2"
                    onClick={() => void loadIgnitionDraft(selectedChatId)}
                  >
                    Refresh draft
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted">
                No draft document yet. After Avril replies with structured data, this panel fills from Convex.
              </p>
            )}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m._id} className={`flex flex-col ${m.authorType === 'agent' ? 'items-start' : 'items-end'}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-xl text-sm smooth-transition border ${
                  m.authorType === 'agent'
                    ? 'bg-violet-500/10 border-violet-400/20 text-gray-200'
                    : 'bg-white/10 border-white/10 text-gray-200'
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
              <div className="max-w-[75%] px-4 py-2.5 rounded-xl text-sm bg-violet-500/10 border border-violet-400/20 text-gray-200">
                <p className="text-xs font-medium text-muted mb-1">AvrilAgent · now</p>
                <div className="chat-markdown whitespace-pre-wrap">{streamingText}</div>
              </div>
            </div>
          )}

          {messages.length === 0 && selectedChatId && (
            <p className="text-sm text-muted">No messages yet. Send the first one.</p>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-black/10 rounded-b-2xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-400 smooth-transition"
            />
            <Button
              type="submit"
              disabled={sending}
              className="text-sm disabled:opacity-50 rounded-xl"
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
