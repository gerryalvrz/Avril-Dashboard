import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import { getControlPlaneState } from '@/src/lib/convexServer';

export async function GET(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (hitRateLimit(`control:state:${ip}`, 180)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded', retryable: true } },
        { status: 429 }
      );
    }

    const missing: string[] = [];
    if (!process.env.CONVEX_SERVER_SECRET) missing.push('CONVEX_SERVER_SECRET');
    if (!process.env.NEXT_PUBLIC_CONVEX_URL && !process.env.CONVEX_URL) {
      missing.push('NEXT_PUBLIC_CONVEX_URL|CONVEX_URL');
    }
    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'CONFIG_ERROR',
            message: `Missing required server env: ${missing.join(', ')}`,
            retryable: false,
          },
        },
        { status: 503 }
      );
    }

    const state = await getControlPlaneState({});
    return NextResponse.json({ ok: true, ...state });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'CONTROL_STATE_FAILED',
          message: err instanceof Error ? err.message : 'Failed to load control plane state',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
