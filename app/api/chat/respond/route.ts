import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, rejectLargePayload, requireDashboardToken } from '@/src/lib/apiSecurity';

type RequestBody = {
  chatId: string;
  message: string;
  model?: 'codex' | 'opus';
};

function getConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

async function callOpenClawBridge(input: { chatId: string; message: string; model?: 'codex' | 'opus' }) {
  const bridgeUrl = process.env.OPENCLAW_BRIDGE_URL;
  const bridgeToken = process.env.OPENCLAW_BRIDGE_TOKEN;

  if (!bridgeUrl || !bridgeToken) return null;

  const tryOnce = async () => {
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

      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.reply || data?.text || data?.message;
      return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
    } finally {
      clearTimeout(timeout);
    }
  };

  return (await tryOnce()) || (await tryOnce());
}

export async function POST(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (hitRateLimit(`respond:${ip}`, 30)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    if (rejectLargePayload(req, 8 * 1024)) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const convexUrl = getConvexUrl();
    if (!convexUrl) {
      return NextResponse.json({ error: 'Missing Convex URL configuration.' }, { status: 500 });
    }

    const body = (await req.json()) as RequestBody;
    const chatId = body.chatId?.trim();
    const message = body.message?.trim();

    if (!chatId || !message) {
      return NextResponse.json({ error: 'chatId and message are required.' }, { status: 400 });
    }

    if (message.length > 1200) {
      return NextResponse.json({ error: 'Message too long (max 1200 chars).' }, { status: 400 });
    }

    const client = new ConvexHttpClient(convexUrl);

    const existingChats = await (client as any).query('chats:listChats', {});
    if (!Array.isArray(existingChats) || !existingChats.some((c: any) => c?._id === chatId)) {
      return NextResponse.json({ error: 'Invalid chatId.' }, { status: 400 });
    }

    await (client as any).mutation('chats:sendMessage', {
      chatId,
      authorType: 'human',
      authorId: 'gerry',
      content: message,
    });

    let assistantText = await callOpenClawBridge({
      chatId,
      message,
      model: body.model,
    });

    if (!assistantText) {
      assistantText =
        'Bridge no disponible. Configura OPENCLAW_BRIDGE_URL y OPENCLAW_BRIDGE_TOKEN en Vercel para usar tus sesiones OAuth de OpenClaw.';
    }

    await (client as any).mutation('chats:sendMessage', {
      chatId,
      authorType: 'agent',
      authorId: 'AgentMotus',
      content: assistantText,
    });

    return NextResponse.json({ ok: true, reply: assistantText });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
