/** Top-level swarm orchestrations OpenClaw should spin up per ignition (business guardrail). */
export const SWARM_ORCHESTRATION_COUNT = 3;

/** Max subagents per swarm (orchestrator + workers), MVP cap. */
export const MAX_SUBAGENTS_PER_SWARM = 3;

/** Soft cap on total agents across all swarms for MVP. */
export const MAX_TOTAL_AGENTS_MVP = 12;

/**
 * Detects Venice folder-card output (# Agent brief · …) pasted/sent as the user message.
 */
export function isFolderAgentBriefMessage(message: string): boolean {
  const t = message.trim();
  if (t.length < 80) return false;
  return /#\s*Agent brief\b/i.test(t) || /\bAgent brief\s*[·\.]/i.test(t);
}

/**
 * Prepended to every payload sent to the OpenClaw bridge so runtimes don't explode into 40+ agents.
 */
export function appendSwarmGuardrailsToIgnitionPrompt(prompt: string): string {
  const header = `[Business OS guardrails \u2014 REQUIRED; do not ignore]
- Create exactly ${SWARM_ORCHESTRATION_COUNT} swarm orchestrations (three top-level squads/orchestrators). Do not spawn dozens of independent agents.
- Each swarm: one orchestrator plus at most ${MAX_SUBAGENTS_PER_SWARM} workers/subagents.
- Total agents across all swarms \u2264 ${MAX_TOTAL_AGENTS_MVP} for this MVP ignition unless a human operator explicitly approves expansion.
- Prefer fewer, deeper workflows over many shallow agents.

--- Founder ignition prompt ---

`;
  return header + prompt.trim();
}

// ── Default 3-swarm topology seeded into Convex after spawn ──

type SwarmDef = {
  id: string;
  name: string;
  role: string;
  workers: Array<{ id: string; name: string; role: string }>;
};

const DEFAULT_SWARMS: SwarmDef[] = [
  {
    id: 'swarm-strategy',
    name: 'Strategy Orchestrator',
    role: 'Strategy & Planning',
    workers: [
      { id: 'sw1-research', name: 'Research Agent', role: 'Market research & data gathering' },
      { id: 'sw1-analyst', name: 'Business Analyst', role: 'Metrics, KPI tracking & reporting' },
    ],
  },
  {
    id: 'swarm-ops',
    name: 'Operations Orchestrator',
    role: 'Operations & Execution',
    workers: [
      { id: 'sw2-builder', name: 'Builder Agent', role: 'Task execution & implementation' },
      { id: 'sw2-qa', name: 'QA Agent', role: 'Quality checks & compliance' },
    ],
  },
  {
    id: 'swarm-growth',
    name: 'Growth Orchestrator',
    role: 'Growth & Outreach',
    workers: [
      { id: 'sw3-content', name: 'Content Agent', role: 'Content creation & comms' },
      { id: 'sw3-outreach', name: 'Outreach Agent', role: 'Distribution & partnerships' },
    ],
  },
];

export type SeedAgent = {
  agentKey: string;
  parentAgentKey?: string;
  name: string;
  role: string;
  status: 'spawning' | 'idle';
};

/**
 * Returns the flat agent list (3 orchestrators + 6 workers) to seed into Convex
 * immediately after a successful spawn so the Office shows the real topology.
 */
export function buildDefaultSwarmAgents(): SeedAgent[] {
  const agents: SeedAgent[] = [];
  for (const swarm of DEFAULT_SWARMS) {
    agents.push({
      agentKey: swarm.id,
      name: swarm.name,
      role: swarm.role,
      status: 'spawning',
    });
    for (const worker of swarm.workers) {
      agents.push({
        agentKey: worker.id,
        parentAgentKey: swarm.id,
        name: worker.name,
        role: worker.role,
        status: 'idle',
      });
    }
  }
  return agents;
}
