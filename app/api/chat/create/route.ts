import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import { createChat } from '@/src/lib/convexServer';

export async function POST(req: Request) {
  if (!requireDashboardToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (hitRateLimit(`create:${ip}`, 40)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = (await req.json()) as {
      title?: string;
      organizationId?: string;
      area?: 'Research' | 'Ops' | 'General';
      subArea?: 'Grants' | 'Competitors' | 'Deploy' | 'Alerts';
    };
    const title = (body.title || 'New Chat').slice(0, 80);
    const chatId = await createChat({
      title,
      organizationId: body.organizationId,
      area: body.area,
      subArea: body.subArea,
    });
    return NextResponse.json({ chatId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Convex error';
    return NextResponse.json(
      { error: message.includes('CONVEX_SERVER_SECRET') ? 'Missing Convex server secret.' : message },
      { status: 500 }
    );
  }
}
