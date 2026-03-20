'use client';

import { useMemo } from 'react';

type AgentStatus = 'spawning' | 'idle' | 'working' | 'blocked' | 'completed' | 'error';

type AgentNode = {
  _id: string;
  agentKey: string;
  parentAgentKey?: string;
  name: string;
  role?: string;
  status: AgentStatus;
  x?: number;
  y?: number;
};

type WorldAgent = {
  id: string;
  agentKey: string;
  parentAgentKey?: string;
  name: string;
  role: string;
  status: AgentStatus;
  x: number;
  y: number;
  ensName?: string;
  description?: string;
  isMock?: boolean;
};

const MOCK_AGENTS: WorldAgent[] = [
  {
    id: 'arkhe',
    agentKey: 'arkhe',
    name: 'ARKHE',
    role: 'Ethics Analyzer',
    status: 'working',
    x: 200,
    y: 150,
    ensName: 'arkhe.avril.eth',
    description: 'Evaluating ethical frameworks',
    isMock: true,
  },
  {
    id: 'lumen',
    agentKey: 'lumen',
    parentAgentKey: 'arkhe',
    name: 'LUMEN',
    role: 'Clinical Context',
    status: 'idle',
    x: 500,
    y: 150,
    ensName: 'lumen.avril.eth',
    description: 'ACA methodology active',
    isMock: true,
  },
  {
    id: 'flux',
    agentKey: 'flux',
    parentAgentKey: 'arkhe',
    name: 'FLUX',
    role: 'Treasury',
    status: 'working',
    x: 350,
    y: 320,
    ensName: 'flux.avril.eth',
    description: 'Processing payments',
    isMock: true,
  },
  {
    id: 'vera',
    agentKey: 'vera',
    name: 'VERA',
    role: 'Identity',
    status: 'idle',
    x: 100,
    y: 320,
    ensName: 'vera.avril.eth',
    description: 'Verifying credentials',
    isMock: true,
  },
  {
    id: 'cirq',
    agentKey: 'cirq',
    name: 'CIRQ',
    role: 'Infrastructure',
    status: 'error',
    x: 600,
    y: 320,
    ensName: 'cirq.avril.eth',
    description: 'Retrying connection',
    isMock: true,
  },
];

const STATUS_DOT_CLASS: Record<AgentStatus, string> = {
  idle: 'bg-emerald-400',
  working: 'bg-amber-400',
  error: 'bg-rose-400',
  spawning: 'bg-blue-400',
  completed: 'bg-teal-400',
  blocked: 'bg-amber-500',
};

const ROLE_AVATAR_CLASS: Record<string, string> = {
  'Ethics Analyzer': 'from-violet-500 to-fuchsia-500',
  'Clinical Context': 'from-cyan-500 to-blue-500',
  Treasury: 'from-amber-500 to-orange-500',
  Identity: 'from-emerald-500 to-teal-500',
  Infrastructure: 'from-rose-500 to-red-500',
};

function withLayout(agents: AgentNode[]): WorldAgent[] {
  const centerX = 420;
  const centerY = 260;

  return agents.map((agent, i) => {
    const hasCoords = typeof agent.x === 'number' && typeof agent.y === 'number';
    const angle = (Math.PI * 2 * i) / Math.max(agents.length, 1);
    const radius = 180 + (i % 3) * 42;

    return {
      id: agent._id,
      agentKey: agent.agentKey,
      parentAgentKey: agent.parentAgentKey,
      name: agent.name,
      role: agent.role || 'Agent',
      status: agent.status,
      x: hasCoords ? (agent.x as number) : Math.round(centerX + Math.cos(angle) * radius),
      y: hasCoords ? (agent.y as number) : Math.round(centerY + Math.sin(angle) * radius),
      ensName: `${agent.agentKey}.agent`,
      description: agent.role ? `${agent.role} active` : 'Agent active',
      isMock: false,
    };
  });
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function OfficeWorld2D({
  agents,
  selectedAgentKey,
  onSelectAgent,
}: {
  agents: AgentNode[];
  selectedAgentKey?: string | null;
  onSelectAgent: (agentKey: string) => void;
}) {
  const hasRealAgents = agents.length > 0;

  const worldAgents = useMemo(() => {
    if (!hasRealAgents) return MOCK_AGENTS;
    return withLayout(agents);
  }, [agents, hasRealAgents]);

  const byKey = useMemo(
    () => new Map(worldAgents.map((agent) => [agent.agentKey, agent])),
    [worldAgents]
  );

  const links = useMemo(() => {
    if (!hasRealAgents) {
      return [
        { parent: 'arkhe', child: 'lumen' },
        { parent: 'arkhe', child: 'flux' },
      ];
    }
    return worldAgents
      .filter((a) => a.parentAgentKey)
      .map((a) => ({ parent: a.parentAgentKey as string, child: a.agentKey }));
  }, [worldAgents, hasRealAgents]);

  return (
    <div className="glass-strong rounded-2xl p-3">
      <div className="relative w-full h-[620px] overflow-auto rounded-xl border border-white/10 bg-slate-950">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(1200px_700px_at_50%_0%,rgba(59,130,246,0.08),transparent_55%),radial-gradient(800px_500px_at_100%_100%,rgba(14,165,233,0.06),transparent_50%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-30 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:28px_28px]" />

        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {links.map((link) => {
            const parent = byKey.get(link.parent);
            const child = byKey.get(link.child);
            if (!parent || !child) return null;

            return (
              <line
                key={`${link.parent}->${link.child}`}
                x1={parent.x + 76}
                y1={parent.y + 56}
                x2={child.x + 76}
                y2={child.y + 56}
                stroke="rgba(56,189,248,0.40)"
                strokeWidth="1.5"
                strokeDasharray={hasRealAgents ? undefined : '5 4'}
              />
            );
          })}
        </svg>

        {worldAgents.map((agent) => {
          const selected = selectedAgentKey === agent.agentKey;
          const avatarGradient =
            ROLE_AVATAR_CLASS[agent.role] || 'from-slate-500 to-slate-400';
          const statusClass = STATUS_DOT_CLASS[agent.status];
          const isWorking = agent.status === 'working';

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent.agentKey)}
              className={`absolute glass rounded-xl p-3 text-left min-w-[152px] max-w-[190px] smooth-transition ${
                selected ? 'ring-2 ring-accent' : 'hover:ring-1 hover:ring-white/25'
              }`}
              style={{ left: agent.x, top: agent.y }}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div
                    className={`h-11 w-11 rounded-full bg-gradient-to-br ${avatarGradient} text-white text-xs font-bold flex items-center justify-center shadow-lg`}
                  >
                    {initialsFromName(agent.name)}
                  </div>
                  <span
                    className={`absolute -right-0.5 -bottom-0.5 inline-block h-3 w-3 rounded-full ring-2 ring-slate-950 ${statusClass} ${
                      isWorking ? 'animate-pulse' : ''
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{agent.name}</p>
                  <p className="text-[11px] text-slate-300 truncate">{agent.role}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {agent.ensName || `${agent.agentKey}.agent`}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400/90 mt-2 truncate">
                {agent.description || 'Operational'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
