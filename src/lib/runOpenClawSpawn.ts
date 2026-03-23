import {
  appendOrchestrationEvent,
  createOrchestrationSession,
  markChatIgnitionSpawned,
  setOrchestrationSessionStatus,
  upsertOrchestrationAgents,
} from '@/src/lib/convexServer';
import {
  appendSwarmGuardrailsToIgnitionPrompt,
  buildDefaultSwarmAgents,
} from '@/src/lib/orchestrationSwarmGuardrails';
import { startOpenClawSessionStream } from '@/src/lib/openclawWsClient';
import { resolveOpenClawAllowedBridgeUrl, resolveOpenClawBridgeUrl } from '@/src/lib/openclawBridgeEnv';

const DEFAULT_ALLOWED_BRIDGE_URL = 'https://openclaw.agents.motusdao.org/respond';

const SPAWN_MAX_ATTEMPTS = 3;
const SPAWN_RETRY_BASE_MS = 4000;

function isRetryableGatewayError(text: string): boolean {
  return /gateway (?:connect failed|closed|agent failed)|falling back to embedded|ECONNREFUSED|timed out|timeout|no reply from openclaw.*gateway/i.test(text);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export type OpenClawSpawnSource = 'manual_prompt' | 'venice_ignition_draft';

export type RunOpenClawSpawnOk = {
  ok: true;
  sessionId: string;
  spawnRequestId: string | null;
  vpsRef: string | null;
  containerRef: string | null;
};

export type RunOpenClawSpawnErr = {
  ok: false;
  sessionId?: string;
  httpStatus: number;
  code: 'CONFIG_ERROR' | 'SPAWN_FAILED' | 'INTERNAL_ERROR';
  message: string;
};

export type RunOpenClawSpawnResult = RunOpenClawSpawnOk | RunOpenClawSpawnErr;

/**
 * Creates an orchestration session, opens the gateway stream, POSTs the prompt to the OpenClaw bridge,
 * and links the chat ignition draft on success.
 */
export async function runOpenClawSpawn(args: {
  organizationId: string;
  chatId: string;
  prompt: string;
  source?: OpenClawSpawnSource;
}): Promise<RunOpenClawSpawnResult> {
  const { organizationId, chatId, prompt, source = 'manual_prompt' } = args;
  const bridgedMessage = appendSwarmGuardrailsToIgnitionPrompt(prompt);

  const sessionId = await createOrchestrationSession({
    organizationId,
    chatId,
    status: 'spawning',
  });

  await appendOrchestrationEvent({
    sessionId,
    type: 'spawn.requested',
    payload: { promptLength: prompt.length, bridgedLength: bridgedMessage.length, source },
  });

  startOpenClawSessionStream(sessionId);

  const bridgeUrl = resolveOpenClawBridgeUrl();
  const bridgeToken = process.env.OPENCLAW_BRIDGE_TOKEN;
  if (!bridgeUrl || !bridgeToken) {
    await setOrchestrationSessionStatus({
      sessionId,
      status: 'failed',
      error: 'Missing OPENCLAW_BRIDGE_URL or OPENCLAW_BRIDGE_TOKEN',
    });
    return {
      ok: false,
      httpStatus: 500,
      code: 'CONFIG_ERROR',
      message: 'Bridge configuration missing',
    };
  }

  const allowedBridgeUrl = resolveOpenClawAllowedBridgeUrl(DEFAULT_ALLOWED_BRIDGE_URL);
  if (bridgeUrl !== allowedBridgeUrl) {
    await setOrchestrationSessionStatus({
      sessionId,
      status: 'failed',
      error: 'OPENCLAW_BRIDGE_URL is not allowed for spawn route',
    });
    return {
      ok: false,
      sessionId,
      httpStatus: 500,
      code: 'CONFIG_ERROR',
      message: `Invalid OPENCLAW_BRIDGE_URL. Expected ${allowedBridgeUrl}`,
    };
  }

  let bridgeRes: Response | null = null;
  let raw = '';
  let parsed: unknown = null;
  let bridgeErrorMessage = '';
  let attempts = 0;

  for (let attempt = 1; attempt <= SPAWN_MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    bridgeRes = null;
    raw = '';
    parsed = null;
    bridgeErrorMessage = '';

    try {
      bridgeRes = await fetch(bridgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bridgeToken}`,
        },
        body: JSON.stringify({ message: bridgedMessage }),
        cache: 'no-store',
      });
    } catch (err) {
      bridgeErrorMessage = err instanceof Error ? err.message : 'Bridge fetch failed';
    }

    if (bridgeRes) {
      raw = await bridgeRes.text().catch(() => '');
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }
    }

    if (bridgeRes && !bridgeRes.ok) {
      const errParsed = parsed as Record<string, unknown> | null;
      bridgeErrorMessage =
        String(
          (typeof errParsed?.error === 'object' && errParsed?.error !== null && 'message' in errParsed.error
            ? String((errParsed.error as { message?: string }).message)
            : undefined) ||
          (typeof errParsed?.error === 'string' ? errParsed.error : null) ||
          raw ||
          `Bridge failed with ${bridgeRes.status}`
        );
    }

    if (bridgeRes?.ok) break;

    const retryable = isRetryableGatewayError(bridgeErrorMessage);
    await appendOrchestrationEvent({
      sessionId,
      type: 'spawn.attempt_failed',
      payload: { attempt, message: bridgeErrorMessage.slice(0, 300), retryable },
    });

    if (!retryable || attempt >= SPAWN_MAX_ATTEMPTS) break;

    const delayMs = SPAWN_RETRY_BASE_MS * Math.pow(2, attempt - 1);
    await sleep(delayMs);
  }

  if (!bridgeRes?.ok) {
    const message = bridgeErrorMessage || 'Bridge request failed';
    const httpStatus = bridgeRes?.status;
    await setOrchestrationSessionStatus({ sessionId, status: 'failed', error: message.slice(0, 500) });
    await appendOrchestrationEvent({
      sessionId,
      type: 'spawn.failed',
      payload: { httpStatus, message, attempts, kind: bridgeRes ? 'http' : 'network' },
    });
    return {
      ok: false,
      sessionId,
      httpStatus: 502,
      code: 'SPAWN_FAILED',
      message: attempts > 1
        ? `${message} (failed after ${attempts} attempts — OpenClaw gateway may be busy, try again in a minute)`
        : message,
    };
  }

  const p = parsed as Record<string, unknown> | null;
  const spawnRequestId = p?.requestId ?? p?.id ?? p?.spawnRequestId;
  const vpsRef = p?.vpsId ?? p?.vpsRef ?? p?.instanceId;
  const containerRef = p?.containerId ?? p?.containerRef;

  await setOrchestrationSessionStatus({
    sessionId,
    status: 'active',
    spawnRequestId: spawnRequestId != null ? String(spawnRequestId) : undefined,
    vpsRef: vpsRef != null ? String(vpsRef) : undefined,
    containerRef: containerRef != null ? String(containerRef) : undefined,
  });
  await appendOrchestrationEvent({
    sessionId,
    type: 'spawn.accepted',
    payload: { ...(p ?? { raw }), source },
  });

  try {
    await upsertOrchestrationAgents({ sessionId, agents: buildDefaultSwarmAgents() });
  } catch {
    /* seeding agents is best-effort */
  }

  try {
    await markChatIgnitionSpawned({ chatId, sessionId });
  } catch {
    /* optional link chat draft → session */
  }

  return {
    ok: true,
    sessionId,
    spawnRequestId: spawnRequestId != null ? String(spawnRequestId) : null,
    vpsRef: vpsRef != null ? String(vpsRef) : null,
    containerRef: containerRef != null ? String(containerRef) : null,
  };
}
