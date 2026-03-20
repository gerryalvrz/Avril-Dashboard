import { NextResponse } from 'next/server';
import { getClientIp, hitRateLimit, requireDashboardToken } from '@/src/lib/apiSecurity';
import { appendOrchestrationEvent } from '@/src/lib/convexServer';
import { sendOpenClawAgentCommand } from '@/src/lib/openclawWsClient';

type Body = {
  sessionId?: string;
  agentKey?: string;
  command?: 'pause' | 'kill';
};

export async function POST(req: Request) {
  try {
    if (!requireDashboardToken(req)) {
      return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
    }
    const ip = getClientIp(req);
    if (hitRateLimit(`orchestration:control:${ip}`, 100)) {
      return NextResponse.json(
        { ok: false, error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        { status: 429 }
      );
    }

    const body = (await req.json()) as Body;
    const sessionId = body.sessionId?.trim();
    const agentKey = body.agentKey?.trim();
    const command = body.command;
    if (!sessionId || !agentKey || (command !== 'pause' && command !== 'kill')) {
      return NextResponse.json(
        { ok: false, error: { code: 'BAD_REQUEST', message: 'sessionId, agentKey and command are required' } },
        { status: 400 }
      );
    }

    sendOpenClawAgentCommand(command, agentKey);
    await appendOrchestrationEvent({
      sessionId,
      type: 'agent.command.sent',
      payload: { agentKey, command },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'CONTROL_FAILED',
          message: err instanceof Error ? err.message : 'Failed to send command',
        },
      },
      { status: 500 }
    );
  }
}
