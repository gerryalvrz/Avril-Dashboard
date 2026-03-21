import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, rejectLargePayload, requireDashboardToken } from '@/src/lib/apiSecurity';
import { listChats, listMessages, sendMessage, sendAgentMessage } from '@/src/lib/convexServer';

/** Max number of recent messages to send to the bridge as per-agent context. */
const BRIDGE_CONTEXT_LAST_N = 20;
/** When a chat has a stored summary, send only this many recent messages (summary covers the rest). */
const BRIDGE_CONTEXT_LAST_N_WHEN_SUMMARY = 10;
/** Max characters per message content when sending context (reduces token use). */
const BRIDGE_CONTEXT_MAX_CONTENT_CHARS = 600;
/** Suggested max total context size (chars) for the bridge; bridge may truncate further. */
const BRIDGE_CONTEXT_MAX_CHARS = 12_000;

type RequestBody = {
  chatId: string;
  message: string;
  organizationId?: string;
  model?: 'codex' | 'opus' | 'venice';
};

type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'BAD_REQUEST'
  | 'CONFIG_ERROR'
  | 'CHAT_NOT_FOUND'
  | 'CONVEX_ERROR'
  | 'BRIDGE_TIMEOUT'
  | 'BRIDGE_ERROR'
  | 'VENICE_TIMEOUT'
  | 'VENICE_ERROR'
  | 'INTERNAL_ERROR';

type BridgeResult =
  | { ok: true; text: string; attempts: number }
  | { ok: false; code: 'BRIDGE_TIMEOUT' | 'BRIDGE_ERROR'; message: string; attempts: number; retryable: boolean };

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  options?: { retryable?: boolean; details?: unknown }
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        retryable: options?.retryable ?? false,
        ...(options?.details !== undefined ? { details: options.details } : {}),
      },
    },
    { status }
  );
}

type BridgeInput = {
  chatId: string;
  message: string;
  model?: 'codex' | 'opus' | 'venice';
  agentId?: string;
  area?: string;
  subArea?: string;
  summary?: string;
  messages?: Array<{ authorType: string; authorId: string; content: string; createdAt: string }>;
  maxContextChars?: number;
};

type VeniceResult =
  | { ok: true; text: string }
  | { ok: false; code: 'VENICE_TIMEOUT' | 'VENICE_ERROR'; message: string; retryable: boolean };

function buildVeniceMessages(input: BridgeInput): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const systemParts = [
    'You are AvrilAgent, an autonomous assistant for Avril Dashboard.',
    input.area ? `Primary area: ${input.area}.` : null,
    input.subArea ? `Sub-area: ${input.subArea}.` : null,
  ].filter(Boolean);

  const fromContext =
    input.messages?.map((msg) => ({
      role: msg.authorType === 'agent' ? ('assistant' as const) : ('user' as const),
      content: String(msg.content ?? ''),
    })) ?? [];

  return [
    { role: 'system', content: systemParts.join(' ') },
    ...(input.summary ? [{ role: 'system' as const, content: `Conversation summary: ${input.summary}` }] : []),
    ...fromContext,
    { role: 'user', content: input.message },
  ];
}

async function callVeniceInference(input: BridgeInput): Promise<VeniceResult> {
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
  const timeout = setTimeout(() => controller.abort(), 60000);
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
          messages: buildVeniceMessages(input),
          temperature: 0.6,
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

    const data: any = await res.json().catch(() => null);
    const text =
      data?.choices?.[0]?.message?.content ??
      data?.reply ??
      data?.text ??
      data?.message ??
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

async function callOpenClawBridge(input: BridgeInput): Promise<BridgeResult> {
  const bridgeUrl = process.env.OPENCLAW_BRIDGE_URL;
  const bridgeToken = process.env.OPENCLAW_BRIDGE_TOKEN;

  if (!bridgeUrl || !bridgeToken) {
    return {
      ok: false,
      code: 'BRIDGE_ERROR',
      message: 'Bridge is not configured. Missing OPENCLAW_BRIDGE_URL or OPENCLAW_BRIDGE_TOKEN.',
      attempts: 0,
      retryable: false,
    };
  }

  const maxAttempts = 2;
  let lastError: BridgeResult | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(bridgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bridgeToken}`,
        },
        body: JSON.stringify({
          message: input.message,
          model: input.model ?? 'codex',
          source: 'avril-dashboard',
          chatId: input.chatId,
          ...(input.agentId !== undefined && { agentId: input.agentId }),
          ...(input.area !== undefined && { area: input.area }),
          ...(input.subArea !== undefined && { subArea: input.subArea }),
          ...(input.summary !== undefined && input.summary.length > 0 && { summary: input.summary }),
          ...(input.messages !== undefined && input.messages.length > 0 && { messages: input.messages }),
          ...(input.maxContextChars !== undefined && { maxContextChars: input.maxContextChars }),
        }),
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        lastError = {
          ok: false,
          code: 'BRIDGE_ERROR',
          message: `Bridge responded with ${res.status}${bodyText ? `: ${bodyText.slice(0, 180)}` : ''}`,
          attempts: attempt,
          retryable: res.status >= 500,
        };
        continue;
      }

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        const text = (await res.text().catch(() => '')).trim();
        if (text.length > 0) {
          return { ok: true, text, attempts: attempt };
        }

        lastError = {
          ok: false,
          code: 'BRIDGE_ERROR',
          message: 'Bridge returned an unreadable response body.',
          attempts: attempt,
          retryable: true,
        };
        continue;
      }

      const text = data?.reply || data?.text || data?.message;
      if (typeof text === 'string' && text.trim().length > 0) {
        return { ok: true, text: text.trim(), attempts: attempt };
      }

      lastError = {
        ok: false,
        code: 'BRIDGE_ERROR',
        message: 'Bridge returned no reply text.',
        attempts: attempt,
        retryable: true,
      };
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastError = {
        ok: false,
        code: isAbort ? 'BRIDGE_TIMEOUT' : 'BRIDGE_ERROR',
        message: isAbort ? 'Bridge request timed out after 12s.' : err instanceof Error ? err.message : 'Bridge request failed.',
        attempts: attempt,
        retryable: true,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  return (
    lastError || {
      ok: false,
      code: 'BRIDGE_ERROR',
      message: 'Bridge request failed with unknown error.',
      attempts: maxAttempts,
      retryable: true,
    }
  );
}

export async function POST(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized');
    }

    const ip = getClientIp(req);
    if (hitRateLimit(`respond:${ip}`, 30)) {
      return errorResponse(429, 'RATE_LIMITED', 'Rate limit exceeded', { retryable: true });
    }

    if (rejectLargePayload(req, 8 * 1024)) {
      return errorResponse(413, 'PAYLOAD_TOO_LARGE', 'Payload too large');
    }

    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return errorResponse(400, 'BAD_REQUEST', 'Invalid JSON body.');
    }

    const chatId = body.chatId?.trim();
    const message = body.message?.trim();

    if (!chatId || !message) {
      return errorResponse(400, 'BAD_REQUEST', 'chatId and message are required.');
    }

    if (message.length > 1200) {
      return errorResponse(400, 'BAD_REQUEST', 'Message too long (max 1200 chars).');
    }

    let existingChats: any[];
    try {
      existingChats = await listChats({ organizationId: body.organizationId });
    } catch (err) {
      return errorResponse(502, 'CONVEX_ERROR', 'Failed to validate chat against Convex.', {
        retryable: true,
        details: err instanceof Error ? err.message : String(err),
      });
    }

    if (!Array.isArray(existingChats) || !existingChats.some((c: any) => c?._id === chatId)) {
      return errorResponse(400, 'CHAT_NOT_FOUND', 'Invalid chatId. The selected chat no longer exists.');
    }

    const currentChat = existingChats.find((c: any) => c?._id === chatId) as
      | { _id: string; agentId?: string; agent?: { name: string; area?: string; subArea?: string }; summary?: string; summaryUpdatedAt?: string }
      | undefined;
    const agentId = currentChat?.agentId;
    const area = currentChat?.agent?.area;
    const subArea = currentChat?.agent?.subArea;
    const hasSummary = Boolean(currentChat?.summary?.trim());

    try {
      await sendMessage({ chatId, content: message });
    } catch (err) {
      return errorResponse(502, 'CONVEX_ERROR', 'Failed to persist user message.', {
        retryable: true,
        details: err instanceof Error ? err.message : String(err),
      });
    }

    let contextMessages: NonNullable<BridgeInput['messages']> = [];
    try {
      const allMessages = await listMessages({ chatId });
      const limit = hasSummary ? BRIDGE_CONTEXT_LAST_N_WHEN_SUMMARY : BRIDGE_CONTEXT_LAST_N;
      const lastN = allMessages.slice(-limit).map((m: any) => {
        const content = String(m.content ?? '').trim();
        const truncated =
          content.length <= BRIDGE_CONTEXT_MAX_CONTENT_CHARS
            ? content
            : content.slice(0, BRIDGE_CONTEXT_MAX_CONTENT_CHARS) + '…';
        return {
          authorType: m.authorType,
          authorId: m.authorId ?? '',
          content: truncated,
          createdAt: m.createdAt,
        };
      });
      contextMessages = lastN;
    } catch {
      // Proceed without context if listing fails
    }

    const input: BridgeInput = {
      chatId,
      message,
      model: body.model,
      agentId,
      area,
      subArea,
      ...(hasSummary && currentChat?.summary && { summary: currentChat.summary.trim() }),
      messages: contextMessages.length > 0 ? contextMessages : undefined,
      maxContextChars: BRIDGE_CONTEXT_MAX_CHARS,
    };

    const result =
      body.model === 'venice' ? await callVeniceInference(input) : await callOpenClawBridge(input);

    if (!result.ok) {
      return errorResponse(502, result.code, result.message, {
        retryable: result.retryable,
        details: 'attempts' in result ? { attempts: result.attempts } : undefined,
      });
    }

    try {
      await sendAgentMessage({ chatId, content: result.text, authorId: 'AvrilAgent' });
    } catch (err) {
      return errorResponse(502, 'CONVEX_ERROR', 'Agent reply received but failed to persist.', {
        retryable: true,
        details: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({ ok: true, reply: result.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return errorResponse(500, 'INTERNAL_ERROR', message, { retryable: true });
  }
}
