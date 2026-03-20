import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, rejectLargePayload, requireDashboardToken } from '@/src/lib/apiSecurity';
import {
  appendOrchestrationEvent,
  createOrchestrationSession,
  getDefaultOrganizationId,
  setOrchestrationSessionStatus,
} from '@/src/lib/convexServer';
import { startOpenClawSessionStream } from '@/src/lib/openclawWsClient';

type SpawnBody = {
  chatId?: string;
  prompt?: string;
  organizationId?: string;
};

const ALLOWED_BRIDGE_URL = 'https://openclaw.agents.motusdao.org/respond';

export async function POST(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    const ip = getClientIp(req);
    if (hitRateLimit(`orchestration:spawn:${ip}`, 20)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        { status: 429 }
      );
    }
    if (rejectLargePayload(req, 16 * 1024)) {
      return NextResponse.json(
        { ok: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Payload too large' } },
        { status: 413 }
      );
    }

    const body = (await req.json()) as SpawnBody;
    const chatId = body.chatId?.trim();
    const prompt = body.prompt?.trim();
    if (!chatId || !prompt) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'chatId and prompt are required' } },
        { status: 400 }
      );
    }

    const organizationId = body.organizationId?.trim() || (await getDefaultOrganizationId());
    const sessionId = await createOrchestrationSession({
      organizationId,
      chatId,
      status: 'spawning',
    });

    await appendOrchestrationEvent({
      sessionId,
      type: 'spawn.requested',
      payload: { promptLength: prompt.length },
    });

    // Keep the gateway connected early so state events start streaming right away.
    startOpenClawSessionStream(sessionId);

    const bridgeUrl = process.env.OPENCLAW_BRIDGE_URL;
    const bridgeToken = process.env.OPENCLAW_BRIDGE_TOKEN;
    if (!bridgeUrl || !bridgeToken) {
      await setOrchestrationSessionStatus({
        sessionId,
        status: 'failed',
        error: 'Missing OPENCLAW_BRIDGE_URL or OPENCLAW_BRIDGE_TOKEN',
      });
      return NextResponse.json(
        { ok: false, error: { code: 'CONFIG_ERROR', message: 'Bridge configuration missing' } },
        { status: 500 }
      );
    }
    if (bridgeUrl !== ALLOWED_BRIDGE_URL) {
      await setOrchestrationSessionStatus({
        sessionId,
        status: 'failed',
        error: 'OPENCLAW_BRIDGE_URL is not allowed for spawn route',
      });
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'CONFIG_ERROR',
            message: `Invalid OPENCLAW_BRIDGE_URL. Expected ${ALLOWED_BRIDGE_URL}`,
          },
          sessionId,
        },
        { status: 500 }
      );
    }

    const bridgeRes = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bridgeToken}`,
      },
      body: JSON.stringify({ message: prompt }),
      cache: 'no-store',
    });

    const raw = await bridgeRes.text().catch(() => '');
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!bridgeRes.ok) {
      const message = parsed?.error?.message || parsed?.error || raw || `Bridge failed with ${bridgeRes.status}`;
      await setOrchestrationSessionStatus({ sessionId, status: 'failed', error: String(message).slice(0, 500) });
      await appendOrchestrationEvent({
        sessionId,
        type: 'spawn.failed',
        payload: { httpStatus: bridgeRes.status, message },
      });
      return NextResponse.json(
        { ok: false, error: { code: 'SPAWN_FAILED', message: String(message) }, sessionId },
        { status: 502 }
      );
    }

    const spawnRequestId = parsed?.requestId || parsed?.id || parsed?.spawnRequestId;
    const vpsRef = parsed?.vpsId || parsed?.vpsRef || parsed?.instanceId;
    const containerRef = parsed?.containerId || parsed?.containerRef;

    await setOrchestrationSessionStatus({
      sessionId,
      status: 'active',
      spawnRequestId: spawnRequestId ? String(spawnRequestId) : undefined,
      vpsRef: vpsRef ? String(vpsRef) : undefined,
      containerRef: containerRef ? String(containerRef) : undefined,
    });
    await appendOrchestrationEvent({
      sessionId,
      type: 'spawn.accepted',
      payload: parsed ?? { raw },
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      status: 'active',
      spawnRequestId: spawnRequestId ?? null,
      vpsRef: vpsRef ?? null,
      containerRef: containerRef ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
