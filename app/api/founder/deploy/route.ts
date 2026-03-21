import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import { deployOpenClawInstance } from '@/src/lib/convexServer';

export async function POST(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    const ip = getClientIp(req);
    if (hitRateLimit(`founder:deploy:${ip}`, 12)) {
      return NextResponse.json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } }, { status: 429 });
    }
    const body = (await req.json().catch(() => ({}))) as { ideaId?: string };
    const result = await deployOpenClawInstance({ ideaId: body.ideaId?.trim() || undefined });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: 'DEPLOY_FAILED', message: err instanceof Error ? err.message : 'Deploy failed' } },
      { status: 500 }
    );
  }
}
