import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, rejectLargePayload, requireDashboardToken } from '@/src/lib/apiSecurity';

const PROFILES = ['conservative', 'balanced', 'ambitious'] as const;
type Profile = (typeof PROFILES)[number];

function isProfile(value: unknown): value is Profile {
  return typeof value === 'string' && (PROFILES as readonly string[]).includes(value);
}

type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'BAD_REQUEST'
  | 'VENICE_TIMEOUT'
  | 'VENICE_ERROR'
  | 'INTERNAL_ERROR';

function errorResponse(status: number, code: ApiErrorCode, message: string, retryable = false) {
  return NextResponse.json(
    { ok: false, error: { code, message, retryable } },
    { status },
  );
}

const SYSTEM = `You are Avril, helping founders operationalize ideas with agentic systems.
The user picks a risk/growth posture. Output exactly ONE polished prompt (plain text; you may use markdown headings and bullets) that they could paste into an agentic OS (OpenClaw-style runtime) to run a business.

The prompt must include:
- One-paragraph vision and ICP
- Operating principles aligned with the posture
- What to automate first vs keep human-in-the-loop
- Guardrails (compliance, brand, spend caps where relevant)
- Success metrics for the first 30–90 days
- A short weekly cadence for the agent
- An explicit "Runtime topology" section stating: instantiate exactly **3 swarm orchestrations** (three top-level orchestrator squads), each with at most **3 worker/subagents**; total agents ≤ **12** for MVP — do not design 40+ agents.

Length: roughly 400–900 words unless context clearly needs more.
Do not wrap in JSON. Do not ask follow-up questions — produce the prompt only.`;

function profileBlock(profile: Profile): string {
  switch (profile) {
    case 'conservative':
      return 'Posture: CONSERVATIVE — validate before scale, low burn, compliance-aware, crawl-walk-run; add automation only after clear ROI.';
    case 'balanced':
      return 'Posture: BALANCED — ship weekly, moderate risk, blend human judgment with automation, iterate from customer feedback.';
    case 'ambitious':
      return 'Posture: AMBITIOUS — compress timelines, parallel bets, aggressive distribution and growth; tolerate higher variance for speed.';
  }
}

type VeniceResult =
  | { ok: true; text: string }
  | { ok: false; code: 'VENICE_TIMEOUT' | 'VENICE_ERROR'; message: string; retryable: boolean };

async function callVeniceChat(messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<VeniceResult> {
  const veniceRaw = process.env.VENICE_INFERENCE_KEY ?? process.env.VENICE_ADMIN_KEY;
  const veniceUrl = process.env.VENICE_INFERENCE_URL || 'https://api.venice.ai/api/v1/chat/completions';
  const veniceModel = process.env.VENICE_MODEL || 'venice-uncensored';

  if (!veniceRaw) {
    return {
      ok: false,
      code: 'VENICE_ERROR',
      message: 'Venice is not configured. Missing VENICE_INFERENCE_KEY or VENICE_ADMIN_KEY.',
      retryable: false,
    };
  }

  const normalizedRaw = veniceRaw.trim().replace(/^Bearer\s+/i, '');
  const keyCandidates = Array.from(
    new Set(
      normalizedRaw.startsWith('VENICE_')
        ? [normalizedRaw]
        : [normalizedRaw, `VENICE_ADMIN_KEY_${normalizedRaw}`, `VENICE_ADMIN_KEY_W_${normalizedRaw}`],
    ),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    let res: Response | null = null;
    let bodyText = '';
    for (const key of keyCandidates) {
      const candidateRes = await fetch(veniceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: veniceModel,
          messages,
          temperature: 0.55,
        }),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (candidateRes.ok || candidateRes.status !== 401) {
        res = candidateRes;
        break;
      }

      bodyText = await candidateRes.text().catch(() => '');
      res = candidateRes;
    }

    if (!res) {
      return {
        ok: false,
        code: 'VENICE_ERROR',
        message: 'Venice request failed before a response was received.',
        retryable: true,
      };
    }

    if (!res.ok) {
      if (!bodyText) bodyText = await res.text().catch(() => '');
      return {
        ok: false,
        code: 'VENICE_ERROR',
        message: `Venice responded with ${res.status}${bodyText ? `: ${bodyText.slice(0, 180)}` : ''}`,
        retryable: res.status >= 500,
      };
    }

    const data: unknown = await res.json().catch(() => null);
    const d = data as Record<string, unknown> | null;
    const choice = d?.choices as Array<{ message?: { content?: string } }> | undefined;
    const text =
      (typeof choice?.[0]?.message?.content === 'string' ? choice[0].message.content : '') ||
      (typeof d?.reply === 'string' ? d.reply : '') ||
      (typeof d?.text === 'string' ? d.text : '') ||
      (typeof d?.message === 'string' ? d.message : '') ||
      '';

    if (typeof text === 'string' && text.trim().length > 0) {
      return { ok: true, text: text.trim() };
    }

    return {
      ok: false,
      code: 'VENICE_ERROR',
      message: 'Venice returned no reply text.',
      retryable: true,
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      code: isAbort ? 'VENICE_TIMEOUT' : 'VENICE_ERROR',
      message: isAbort ? 'Venice request timed out after 60s.' : err instanceof Error ? err.message : 'Venice request failed.',
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  if (!requireDashboardToken(req)) {
    return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized.');
  }

  const ip = getClientIp(req);
  if (hitRateLimit(`folder-profile:${ip}`, 25)) {
    return errorResponse(429, 'RATE_LIMITED', 'Too many requests. Try again in a few minutes.', true);
  }

  if (rejectLargePayload(req, 48 * 1024)) {
    return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Request body too large.');
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Invalid JSON body.');
  }

  const b = body as Record<string, unknown>;
  if (!isProfile(b.profile)) {
    return errorResponse(400, 'BAD_REQUEST', 'Missing or invalid profile (conservative | balanced | ambitious).');
  }

  const profile = b.profile;
  const context =
    typeof b.context === 'string' ? b.context.slice(0, 12_000) : '';

  const userContent = `${profileBlock(profile)}

Optional founder / chat context to align the idea (if empty, pick a plausible modern SMB or solo-founder vertical and still write the full prompt):
---
${context.trim() || '(none)'}
---

Write the single agentic business prompt now. Start with a title line: # Agent brief · ${profile.charAt(0).toUpperCase()}${profile.slice(1)}`;

  const venice = await callVeniceChat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: userContent },
  ]);

  if (!venice.ok) {
    return errorResponse(venice.code === 'VENICE_TIMEOUT' ? 504 : 502, venice.code, venice.message, venice.retryable);
  }

  return NextResponse.json({ ok: true, prompt: venice.text });
}
