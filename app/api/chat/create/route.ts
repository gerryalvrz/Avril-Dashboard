import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';

function getConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

export async function POST(req: Request) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    return NextResponse.json({ error: 'Missing Convex URL configuration.' }, { status: 500 });
  }

  const body = (await req.json()) as { title?: string };
  const client = new ConvexHttpClient(convexUrl);
  const chatId = await (client as any).mutation('chats:createChat', { title: body.title || 'New Chat' });

  return NextResponse.json({ chatId });
}
