import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, rejectLargePayload, requireDashboardToken } from '@/src/lib/apiSecurity';

type RequestBody = {
  chatId: string;
  message: string;
  organizationId?: string;
  model?: 'codex' | 'opus';
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
  | 'INTERNAL_ERROR';

type BridgeResult =
  | { ok: true; text: string; attempts: number }
  | { ok: false; code: 'BRIDGE_TIMEOUT' | 'BRIDGE_ERROR'; message: string; attempts: number; retryable: boolean };

function getConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

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

async function callOpenClawBridge(input: { chatId: string; message: string; model?: 'codex' | 'opus' }): Promise<BridgeResult> {
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
    const timeout = setTimeout(() => controller.abort(), 12000);

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
          source: 'agentdashboard',
          chatId: input.chatId,
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

    const convexUrl = getConvexUrl();
    if (!convexUrl) {
      return errorResponse(500, 'CONFIG_ERROR', 'Missing Convex URL configuration.');
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

    const client = new ConvexHttpClient(convexUrl);

    let existingChats: any[];
    try {
      existingChats = await (client as any).query('chats:listChats', {
        organizationId: body.organizationId,
      });
    } catch (err) {
      return errorResponse(502, 'CONVEX_ERROR', 'Failed to validate chat against Convex.', {
        retryable: true,
        details: err instanceof Error ? err.message : String(err),
      });
    }

    if (!Array.isArray(existingChats) || !existingChats.some((c: any) => c?._id === chatId)) {
      return errorResponse(400, 'CHAT_NOT_FOUND', 'Invalid chatId. The selected chat no longer exists.');
    }

    try {
      await (client as any).mutation('chats:sendMessage', {
        chatId,
        content: message,
      });
    } catch (err) {
      return errorResponse(502, 'CONVEX_ERROR', 'Failed to persist user message.', {
        retryable: true,
        details: err instanceof Error ? err.message : String(err),
      });
    }

    const bridge = await callOpenClawBridge({
      chatId,
      message,
      model: body.model,
    });

    if (!bridge.ok) {
      return errorResponse(502, bridge.code, bridge.message, {
        retryable: bridge.retryable,
        details: { attempts: bridge.attempts },
      });
    }

    try {
      await (client as any).mutation('chats:sendAgentMessage', {
        chatId,
        content: bridge.text,
        authorId: 'AgentMotus',
      });
    } catch (err) {
      return errorResponse(502, 'CONVEX_ERROR', 'Agent reply received but failed to persist.', {
        retryable: true,
        details: err instanceof Error ? err.message : String(err),
      });
    }

    return NextResponse.json({ ok: true, reply: bridge.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return errorResponse(500, 'INTERNAL_ERROR', message, { retryable: true });
  }
}
