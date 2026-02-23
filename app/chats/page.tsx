const THREADS = [
  { id: 'ch-1', title: '#general', lastMessage: 'Gerry: vamos con el deploy', time: '2 min ago', unread: 3 },
  { id: 'ch-2', title: 'AgentMotus', lastMessage: 'Push exitoso a agentdashboard', time: '10 min ago', unread: 0 },
  { id: 'ch-3', title: 'ResearchAgent', lastMessage: 'Found 3 new grant programs', time: '1h ago', unread: 1 },
  { id: 'ch-4', title: 'TradingAgent', lastMessage: 'Market scan paused — awaiting config', time: '3h ago', unread: 0 },
];

const MESSAGES = [
  { author: 'Gerry', type: 'human' as const, text: 'Hey, ya quedó el scaffold del dashboard?', time: '5:30 PM' },
  { author: 'AgentMotus', type: 'agent' as const, text: 'Sí, ya hice push con el one-shot prompt ejecutado. Scaffold completo en main.', time: '5:31 PM' },
  { author: 'Gerry', type: 'human' as const, text: 'Perfecto. Ahora necesito el frontend con sidebar y topbar.', time: '5:32 PM' },
  { author: 'AgentMotus', type: 'agent' as const, text: 'En eso estoy. Dame unos minutos y lo subo.', time: '5:33 PM' },
];

export default function ChatsPage() {
  return (
    <div className="flex gap-4 h-[calc(100vh-5rem)]">
      <div className="w-72 bg-panel border border-border rounded-xl overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">Threads</h3>
        </div>
        {THREADS.map((t) => (
          <div key={t.id} className="px-4 py-3 border-b border-border/50 hover:bg-white/[0.02] cursor-pointer">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-white">{t.title}</span>
              {t.unread > 0 && (
                <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{t.unread}</span>
              )}
            </div>
            <p className="text-xs text-muted truncate">{t.lastMessage}</p>
            <p className="text-[10px] text-muted/60 mt-0.5">{t.time}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 bg-panel border border-border rounded-xl flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">#general</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {MESSAGES.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.type === 'agent' ? 'items-start' : 'items-end'}`}>
              <div className={`max-w-[70%] px-4 py-2.5 rounded-xl text-sm ${
                m.type === 'agent' ? 'bg-accent/10 text-gray-200' : 'bg-white/10 text-gray-200'
              }`}>
                <p className="text-xs font-medium text-muted mb-1">{m.author} · {m.time}</p>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-accent"
            />
            <button className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
