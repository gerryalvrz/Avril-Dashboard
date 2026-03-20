import { NextResponse } from 'next/server';
import { requireDashboardToken } from '@/src/lib/apiSecurity';

type Reachability = 'reachable' | 'unreachable';

async function checkHead(url: string, token: string, timeoutMs = 6000): Promise<Reachability> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    return res.ok ? 'reachable' : 'unreachable';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  if (!requireDashboardToken(req)) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  const bridgeUrl = process.env.OPENCLAW_BRIDGE_URL;
  const bridgeToken = process.env.OPENCLAW_BRIDGE_TOKEN;
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!bridgeUrl || !bridgeToken || !gatewayUrl || !gatewayToken) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'CONFIG_ERROR', message: 'Missing OpenClaw gateway/bridge env vars' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  // Use HEAD checks against bridge endpoint and gateway host (wss -> https).
  const gatewayHeadUrl = gatewayUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
  const [bridge, gateway] = await Promise.all([
    checkHead(bridgeUrl, bridgeToken),
    checkHead(gatewayHeadUrl, gatewayToken),
  ]);

  return NextResponse.json({
    gateway,
    bridge,
    timestamp: new Date().toISOString(),
  });
}
