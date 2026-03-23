import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import { getChatIgnitionDraft } from '@/src/lib/convexServer';

export async function GET(req: Request) {
  if (!requireDashboardToken(req)) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (hitRateLimit(`chat:ignition-draft:${ip}`, 120)) {
    return NextResponse.json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } }, { status: 429 });
  }

  const url = new URL(req.url);
  const chatId = url.searchParams.get('chatId')?.trim();
  if (!chatId) {
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'chatId is required' } }, { status: 400 });
  }

  try {
    const draft = await getChatIgnitionDraft({ chatId });
    return NextResponse.json({ ok: true, draft: draft ?? null });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'CONVEX_ERROR',
          message: err instanceof Error ? err.message : 'Failed to load ignition draft',
        },
      },
      { status: 502 }
    );
  }
}
