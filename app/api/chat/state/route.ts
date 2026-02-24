import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';

function getConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

export async function GET(req: Request) {
  if (!requireDashboardToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (hitRateLimit(`state:${ip}`, 300)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    return NextResponse.json({ error: 'Missing Convex URL configuration.' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');
  const client = new ConvexHttpClient(convexUrl);

  const chats = await (client as any).query('chats:listChats', {});
  const messages = chatId ? await (client as any).query('chats:listMessages', { chatId }) : [];

  return NextResponse.json({ chats, messages });
}
