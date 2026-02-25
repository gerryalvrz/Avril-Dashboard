/**
 * Client-safe copy of agent areas/sub-areas for UI (e.g. chat creation).
 * Must stay in sync with convex/lib/agentAreas.ts.
 */
export const AGENT_AREAS = ['Research', 'Ops', 'General'] as const;
export type AgentArea = (typeof AGENT_AREAS)[number];

export const AGENT_SUB_AREAS: Record<AgentArea, readonly string[]> = {
  Research: ['Grants', 'Competitors'],
  Ops: ['Deploy', 'Alerts'],
  General: [],
} as const;

export const DEFAULT_AGENT_AREA: AgentArea = 'General';

export type AgentSubArea = 'Grants' | 'Competitors' | 'Deploy' | 'Alerts';

export function getSubAreasForArea(area: AgentArea): readonly string[] {
  return AGENT_SUB_AREAS[area];
}
