import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import { selectCompanyOption } from '@/src/lib/convexServer';

type Body = {
  ideaId?: string;
  selectedOptionKey?: string;
  selectedProfile?: 'conservative' | 'balanced' | 'ambitious';
  rationale?: string;
};

export async function POST(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    const ip = getClientIp(req);
    if (hitRateLimit(`founder:select-route:${ip}`, 40)) {
      return NextResponse.json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } }, { status: 429 });
    }
    const body = (await req.json()) as Body;
    if (!body.ideaId || !body.selectedOptionKey || !body.selectedProfile) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'ideaId, selectedOptionKey, selectedProfile are required' } },
        { status: 400 }
      );
    }
    const routeId = await selectCompanyOption({
      ideaId: body.ideaId,
      selectedOptionKey: body.selectedOptionKey,
      selectedProfile: body.selectedProfile,
      rationale: body.rationale,
    });
    return NextResponse.json({ ok: true, routeId });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: { code: 'SELECT_ROUTE_FAILED', message: err instanceof Error ? err.message : 'Failed' } },
      { status: 500 }
    );
  }
}
