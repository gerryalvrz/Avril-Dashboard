/**
 * Maps assistant JSON (architectPayload) into Convex chatIgnitionDrafts fields.
 */
export function extractDraftFromArchitectPayload(
  p: Record<string, unknown> | null
): {
  phase?: string;
  captured?: unknown;
  ignitionPrompt?: string;
  handoffPayload?: unknown;
  nextStatus: 'collecting' | 'ready';
} | null {
  if (!p) return null;

  const phase = typeof p.phase === 'string' ? p.phase : undefined;
  const captured = p.captured;
  const handoffPayload = p.handoffPayload;

  let ignitionPrompt: string | undefined;
  if (handoffPayload && typeof handoffPayload === 'object' && handoffPayload !== null) {
    const ip = (handoffPayload as Record<string, unknown>).ignitionPrompt;
    if (typeof ip === 'string' && ip.trim()) ignitionPrompt = ip.trim();
  }

  if (phase === 'handoff_ready' && !ignitionPrompt?.trim() && captured && typeof captured === 'object') {
    ignitionPrompt = `Founder control plane (Avril chat export, handoff_ready):\n${JSON.stringify(captured, null, 2)}`;
  }

  const nextStatus: 'collecting' | 'ready' =
    phase === 'handoff_ready' && Boolean(ignitionPrompt?.trim()) ? 'ready' : 'collecting';

  return { phase, captured, ignitionPrompt, handoffPayload, nextStatus };
}
