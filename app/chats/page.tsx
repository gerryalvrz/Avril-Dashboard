'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Chat = {
  _id: string;
  title: string;
  updatedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
};

type Msg = {
  _id: string;
  authorType: 'human' | 'agent';
  authorId: string;
  content: string;
  createdAt: string;
};

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ChatsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const loadState = async (chatId?: string | null) => {
    const query = chatId ? `?chatId=${encodeURIComponent(chatId)}` : '';
    const res = await fetch(`/api/chat/state${query}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setChats(data.chats || []);
    setMessages(data.messages || []);
  };

  useEffect(() => {
    void loadState(selectedChatId);
    const id = setInterval(() => void loadState(selectedChatId), 2000);
    return () => clearInterval(id);
  }, [selectedChatId]);

  useEffect(() => {
    if (!selectedChatId && chats.length > 0) {
      setSelectedChatId(chats[0]._id);
    }
  }, [chats, selectedChatId]);

  const selectedChat = useMemo(
    () => chats.find((c) => c._id === selectedChatId),
    [chats, selectedChatId]
  );

  async function handleCreateChat() {
    const res = await fetch('/api/chat/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `Chat ${chats.length + 1}` }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setSelectedChatId(data.chatId);
    await loadState(data.chatId);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;

    let chatId = selectedChatId;
    if (!chatId) {
      const createRes = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (!createRes.ok) return;
      const created = await createRes.json();
      chatId = created.chatId;
      setSelectedChatId(chatId);
    }

    setSending(true);
    const message = draft.trim();
    setDraft('');

    try {
      await fetch('/api/chat/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message, model: 'codex' }),
      });
      await loadState(chatId);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)]">
      <div className="w-72 bg-panel border border-border rounded-xl overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Threads</h3>
          <button
            onClick={handleCreateChat}
            className="text-xs px-2 py-1 bg-accent hover:bg-accent-hover rounded-md text-white"
          >
            + New
          </button>
        </div>

        {chats.map((t) => (
          <button
            key={t._id}
            onClick={() => setSelectedChatId(t._id)}
            className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-white/[0.02] ${
              selectedChatId === t._id ? 'bg-white/[0.03]' : ''
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-white truncate">{t.title}</span>
            </div>
            <p className="text-xs text-muted truncate">{t.lastMessage || 'No messages yet'}</p>
            <p className="text-[10px] text-muted/60 mt-0.5">{timeLabel(t.lastMessageAt || t.updatedAt)}</p>
          </button>
        ))}

        {chats.length === 0 && <p className="p-4 text-xs text-muted">No chats yet. Create one.</p>}
      </div>

      <div className="flex-1 bg-panel border border-border rounded-xl flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">{selectedChat?.title || 'Select a chat'}</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m._id} className={`flex flex-col ${m.authorType === 'agent' ? 'items-start' : 'items-end'}`}>
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${
                  m.authorType === 'agent' ? 'bg-accent/10 text-gray-200' : 'bg-white/10 text-gray-200'
                }`}
              >
                <p className="text-xs font-medium text-muted mb-1">
                  {m.authorId} · {timeLabel(m.createdAt)}
                </p>
                {m.content}
              </div>
            </div>
          ))}

          {messages.length === 0 && selectedChatId && (
            <p className="text-sm text-muted">No messages yet. Send the first one.</p>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
