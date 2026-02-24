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

async function callOpenAI(message: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are AgentMotus, concise and execution-focused.' },
        { role: 'user', content: message },
      ],
      temperature: 0.4,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

async function callAnthropic(message: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 400,
      system: 'You are AgentMotus, concise and execution-focused.',
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.content?.find((c: { type: string; text?: string }) => c.type === 'text')?.text;
  return text?.trim() || null;
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

  let assistantText: string | null = null;

  if (body.model === 'opus') {
    assistantText = (await callAnthropic(message)) || (await callOpenAI(message));
  } else {
    assistantText = (await callOpenAI(message)) || (await callAnthropic(message));
  }

  if (!assistantText) {
    assistantText = `Recibido: "${message}". Estoy en modo fallback hasta que configuremos la API key del proveedor LLM.`;
  }

  await (client as any).mutation('chats:sendMessage', {
    chatId,
    authorType: 'agent',
    authorId: 'AgentMotus',
    content: assistantText,
  });

  return NextResponse.json({ ok: true });
}
