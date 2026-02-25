import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import { listAgents } from '@/src/lib/convexServer';

export async function GET(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (hitRateLimit(`agents:${ip}`, 60)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', retryable: true } },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId')?.trim() ?? undefined;

    const agents = await listAgents({ organizationId });

    return NextResponse.json({ ok: true, agents: agents ?? [] });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'AGENTS_FETCH_FAILED',
          message: err instanceof Error ? err.message : 'Failed to fetch agents',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
