'use client';

type AgentNode = {
  _id: string;
  agentKey: string;
  parentAgentKey?: string;
  name: string;
  role?: string;
  status: 'spawning' | 'idle' | 'working' | 'blocked' | 'completed' | 'error';
  x?: number;
  y?: number;
};

const STATUS_STYLES: Record<AgentNode['status'], string> = {
  spawning: 'bg-blue-400',
  idle: 'bg-slate-400',
  working: 'bg-emerald-400 animate-pulse',
  blocked: 'bg-amber-400 animate-pulse',
  completed: 'bg-cyan-400',
  error: 'bg-rose-400 animate-pulse',
};

export default function AgentNodeCard({
  agent,
  selected,
  onClick,
}: {
  agent: AgentNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute glass px-3 py-2 rounded-xl text-left min-w-[170px] max-w-[220px] smooth-transition ${
        selected ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-white/20'
      }`}
      style={{ left: agent.x ?? 0, top: agent.y ?? 0 }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_STYLES[agent.status]}`} />
      </div>
      <p className="text-[11px] text-muted mt-0.5 truncate">{agent.role || 'Agent'}</p>
      <p className="text-[10px] text-muted/70 mt-1 truncate">{agent.agentKey}</p>
    </button>
  );
}
