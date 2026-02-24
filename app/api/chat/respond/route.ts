import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

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

  if (!bridgeUrl || !bridgeToken) {
    return null;
  }

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
  });

  if (!res.ok) return null;

  const data = await res.json();
  const text = data?.reply || data?.text || data?.message;
  return typeof text === 'string' && text.trim().length > 0 ? text.trim() : null;
}

export async function POST(req: Request) {
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

  const client = new ConvexHttpClient(convexUrl);

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

  return NextResponse.json({ ok: true });
}
