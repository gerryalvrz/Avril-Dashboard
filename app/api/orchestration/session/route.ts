import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import {
  getOrchestrationSession,
  getOrchestrationSessionByChat,
  listOrchestrationAgents,
  listOrchestrationEvents,
} from '@/src/lib/convexServer';

export async function GET(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (hitRateLimit(`orchestration:session:${ip}`, 180)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId')?.trim();
    const chatId = searchParams.get('chatId')?.trim();

    let resolvedSessionId = sessionId || null;
    if (!resolvedSessionId && chatId) {
      const byChat = await getOrchestrationSessionByChat({ chatId });
      resolvedSessionId = byChat?._id ?? null;
    }

    if (!resolvedSessionId) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'sessionId or chatId is required' } },
        { status: 400 }
      );
    }

    const [session, agents, events] = await Promise.all([
      getOrchestrationSession({ sessionId: resolvedSessionId }),
      listOrchestrationAgents({ sessionId: resolvedSessionId }),
      listOrchestrationEvents({ sessionId: resolvedSessionId, limit: 100 }),
    ]);

    return NextResponse.json({ ok: true, session, agents, events });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'SESSION_FETCH_FAILED',
          message: err instanceof Error ? err.message : 'Failed to fetch orchestration session',
        },
      },
      { status: 500 }
    );
  }
}
