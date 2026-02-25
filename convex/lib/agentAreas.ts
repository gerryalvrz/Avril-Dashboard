import { v } from 'convex/values';

/**
 * Defined set of areas for sub-agents (virtual office).
 * Use these when creating/updating agents and for filtering.
 */
export const AGENT_AREAS = ['Research', 'Ops', 'General'] as const;
export type AgentArea = (typeof AGENT_AREAS)[number];

/**
 * Sub-areas per area. Research → Grants, Competitors; Ops → Deploy, Alerts; General → none.
 */
export const AGENT_SUB_AREAS: Record<AgentArea, readonly string[]> = {
  Research: ['Grants', 'Competitors'],
  Ops: ['Deploy', 'Alerts'],
  General: [],
} as const;

export const AGENT_SUB_AREA_VALUES = ['Grants', 'Competitors', 'Deploy', 'Alerts'] as const;
export type AgentSubArea = (typeof AGENT_SUB_AREA_VALUES)[number];

/** Default area when creating an agent from a new chat (no area chosen yet). */
export const DEFAULT_AGENT_AREA: AgentArea = 'General';

/** Validator for area (for use in Convex args/schema). */
export const areaValidator = v.union(
  v.literal('Research'),
  v.literal('Ops'),
  v.literal('General')
);

/** Validator for optional sub-area. */
export const subAreaValidator = v.optional(
  v.union(
    v.literal('Grants'),
    v.literal('Competitors'),
    v.literal('Deploy'),
    v.literal('Alerts')
  )
);

export function isValidSubAreaForArea(area: AgentArea, subArea: string | undefined): boolean {
  if (subArea === undefined) return true;
  return (AGENT_SUB_AREAS[area] as readonly string[]).includes(subArea);
}
