import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';

function getConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

export async function POST(req: Request) {
  if (!requireDashboardToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (hitRateLimit(`create:${ip}`, 40)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    return NextResponse.json({ error: 'Missing Convex URL configuration.' }, { status: 500 });
  }

  const body = (await req.json()) as { title?: string; organizationId?: string };
  const title = (body.title || 'New Chat').slice(0, 80);
  const client = new ConvexHttpClient(convexUrl);
  const chatId = await (client as any).mutation('chats:createChat', {
    title,
    organizationId: body.organizationId,
  });

  return NextResponse.json({ chatId });
}
