import { ConvexHttpClient } from 'convex/browser';
import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';

function getConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
}

export async function GET(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (hitRateLimit(`state:${ip}`, 300)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', retryable: true } },
        { status: 429 }
      );
    }

    const convexUrl = getConvexUrl();
    if (!convexUrl) {
      return NextResponse.json(
        { ok: false, error: { code: 'CONFIG_ERROR', message: 'Missing Convex URL configuration.' } },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId')?.trim();
    const organizationId = searchParams.get('organizationId')?.trim();
    const client = new ConvexHttpClient(convexUrl);

    const chats = await (client as any).query('chats:listChats', { organizationId: organizationId || undefined });

    if (!chatId) {
      return NextResponse.json({ ok: true, chats, messages: [] });
    }

    if (!Array.isArray(chats) || !chats.some((c: any) => c?._id === chatId)) {
      return NextResponse.json(
        { ok: false, error: { code: 'CHAT_NOT_FOUND', message: 'Invalid chatId. The selected chat no longer exists.' } },
        { status: 400 }
      );
    }

    const messages = await (client as any).query('chats:listMessages', { chatId });

    return NextResponse.json({ ok: true, chats, messages });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'STATE_FETCH_FAILED',
          message: err instanceof Error ? err.message : 'Failed to fetch chat state',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
